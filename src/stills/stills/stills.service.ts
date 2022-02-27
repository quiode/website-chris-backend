import {
  HttpException,
  Injectable,
  NotFoundException,
  HttpStatus,
  BadRequestException,
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
    fs.mkdirSync(join(process.cwd(), Constants.stills_thumbnails_path), { recursive: true });
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
    return this.stillsRepository.find();
  }

  getAmount(amount: number) {
    return this.stillsRepository.find({ where: { position: LessThan(amount) } });
  }

  amount() {
    return this.stillsRepository.count();
  }

  getRange(start: number, end: number) {
    return this.stillsRepository.find({
      where: { position: Between(start, end) },
    });
  }
}
