import {
  HttpException,
  Injectable,
  NotFoundException,
  HttpStatus,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createReadStream, ReadStream } from 'fs';
import { join } from 'path/posix';
import { Between, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Stills } from '../stills.entity';
import { Constants } from '../../constants';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as sharp from 'sharp';

export interface updateBody {
  uuid: string;
  position: number;
}

@Injectable()
export class StillsService {
  constructor(@InjectRepository(Stills) private stillsRepository: Repository<Stills>) {}

  async checkIfUUIDExists(uuid: string) {
    const result = await this.stillsRepository.findOne({ where: { id: uuid } });
    if (!result) {
      throw new NotFoundException('UUID not found');
    }
    return true;
  }

  getOriginal(uuid: string): ReadStream {
    return createReadStream(
      join(process.cwd(), Constants.stills_path, uuid + Constants.image_extension)
    );
  }

  getThumbnail(uuid: string): ReadStream {
    return createReadStream(
      join(process.cwd(), Constants.stills_thumbnails_path, uuid + Constants.image_extension)
    );
  }

  /**
   * retrieves the data stored in the database of a still
   * @param uuid the uuid of the image
   * @returns the stored data of the given uuid
   */
  getMetadata(uuid: string): Promise<Stills> {
    return this.stillsRepository.findOne({ where: { id: uuid } });
  }

  async checkIfFileExists(file: Express.Multer.File): Promise<boolean> {
    const promise: Promise<string> = new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(file.path);
      stream.on('error', (err) => reject(err));
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });

    const hash = await promise;

    const identicalFiles = this.stillsRepository.find({
      where: { hash: hash },
    });

    if ((await identicalFiles).length > 0) {
      return true;
    }

    return false;
  }

  /**
   * saves an image in orignal and compressed format and makes an entry in the database
   * @param file file to be saved
   * @param position position of the file
   */
  async save(file: Express.Multer.File, position = -1) {
    const promise: Promise<string> = new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(file.path);
      stream.on('error', (err) => reject(err));
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });

    // create metadata
    const hash = await promise;
    const uuid = crypto.randomUUID();
    if (position < 0) {
      position = await this.stillsRepository.count();
    } else {
      if (position > (await this.stillsRepository.count())) {
        throw new BadRequestException('Position is out of bounds');
      }
      const insertProccess = this.insertPosition(position);
    }
    // save file to final destination
    const filePath = join(process.cwd(), Constants.stills_path, uuid + Constants.image_extension);
    fs.mkdirSync(Constants.stills_path, { recursive: true });
    fs.copyFileSync(join(process.cwd(), file.path), filePath);
    fs.rmSync(join(process.cwd(), file.destination), { recursive: true });
    fs.mkdirSync(join(process.cwd(), file.destination), { recursive: true });
    // make thumbnail
    fs.mkdirSync(join(process.cwd(), Constants.stills_thumbnails_path), {
      recursive: true,
    });
    const thumbnailPath = join(
      process.cwd(),
      Constants.stills_thumbnails_path,
      uuid + Constants.image_extension
    );
    this.compressImage(filePath, thumbnailPath);
    // save metadata
    const still = new Stills();
    still.id = uuid;
    still.hash = hash;
    still.position = position;
    return this.stillsRepository.save(still);
  }

  /**
   * moves all files with a position greater than the given position to the right so that the given position can be inserted
   * @param position position where the file should be inserted
   */
  async insertPosition(position: number) {
    const stills = this.stillsRepository.find({
      where: { position: MoreThanOrEqual(position) },
    });

    (await stills).forEach(async (still) => {
      await this.stillsRepository.update({ id: still.id }, { position: still.position + 1 });
    });
  }

  compressImage(path: string, output: string) {
    return sharp(path).jpeg({ quality: 40 }).resize(100).toFile(output);
  }

  getAll() {
    return this.stillsRepository.find({ order: { position: 'ASC' } });
  }

  getAmount(amount: number) {
    return this.stillsRepository.find({
      where: { position: LessThan(amount) },
    });
  }

  amount() {
    return this.stillsRepository.count();
  }

  getRange(start: number, end: number) {
    return this.stillsRepository.find({
      where: { position: Between(start, end) },
    });
  }

  update(content: updateBody) {
    return this.stillsRepository.update({ id: content.uuid }, { position: content.position });
  }

  /**
   * changes position of one still with another
   * @param uuid1
   * @param uuid2
   */
  async reorder(uuid1: string, uuid2: string) {
    const still1 = await this.stillsRepository.findOne({
      where: { id: uuid1 },
    });
    const still2 = await this.stillsRepository.findOne({
      where: { id: uuid2 },
    });
    await this.stillsRepository.update({ id: uuid1 }, { position: -1 });
    await this.stillsRepository.update({ id: uuid2 }, { position: still1.position });
    await this.stillsRepository.update({ id: uuid1 }, { position: still2.position });
    return {
      still1: await this.stillsRepository.findOne({ where: { id: uuid1 } }),
      still2: await this.stillsRepository.findOne({ where: { id: uuid2 } }),
    };
  }

  /**
   * deletes the still and moves all files with a position greater than the given position to the left (so that position is consistent)
   * @param uuid uuid of the still to be deleted
   */
  delete(uuid: string) {
    // delete still in database
    this.stillsRepository.findOne({ where: { id: uuid } }).then((still) => {
      const position = still.position;
      this.stillsRepository.delete({ id: uuid }).then(async () => {
        const stills = this.stillsRepository.find({
          where: {
            position: MoreThanOrEqual(position),
          },
        });
        stills.then((stills) => {
          stills.forEach(async (still) => {
            this.stillsRepository.update({ id: still.id }, { position: still.position - 1 });
          });
        });
      });
    });
    // delete still in file system
    fs.rm(join(process.cwd(), Constants.stills_path, uuid + Constants.image_extension), (err) => {
      if (err) {
        throw new InternalServerErrorException(err);
      }
    });
    fs.rm(
      join(process.cwd(), Constants.stills_thumbnails_path, uuid + Constants.image_extension),
      (err) => {
        if (err) {
          throw new InternalServerErrorException(err);
        }
      }
    );
  }

  async insert(uuid: string, position: number) {
    const previousPosition = (await this.stillsRepository.findOne({ where: { id: uuid } }))
      .position;
    if (previousPosition == position) {
      return;
    }
    await this.stillsRepository.update({ id: uuid }, { position: -1 });
    if (previousPosition < position) {
      const inBetweenValues = await this.stillsRepository.find({
        where: { position: Between(previousPosition, position) },
        order: { position: 'ASC' },
      });
      for (let i = 0; i < inBetweenValues.length; i++) {
        await this.stillsRepository.update(
          { id: inBetweenValues[i].id },
          { position: inBetweenValues[i].position - 1 }
        );
      }
    } else {
      const inBetweenValues = await this.stillsRepository.find({
        where: { position: Between(position, previousPosition) },
        order: { position: 'DESC' },
      });
      for (let i = 0; i < inBetweenValues.length; i++) {
        await this.stillsRepository.update(
          { id: inBetweenValues[i].id },
          { position: inBetweenValues[i].position + 1 }
        );
      }
    }
    await this.stillsRepository.update({ id: uuid }, { position: position });
  }
}
