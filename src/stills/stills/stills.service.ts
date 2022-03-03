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
import { MediaService } from 'src/media/media.service';
import Jimp from 'jimp';

export interface updateBody {
  uuid: string;
  position: number;
}

@Injectable()
export class StillsService {
  constructor(
    @InjectRepository(Stills) private stillsRepository: Repository<Stills>,
    private mediaService: MediaService
  ) {}

  async checkIfUUIDExists(uuid: string) {
    return this.mediaService.checkIfUUIDExists(uuid, this.stillsRepository);
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
    return this.mediaService.getMetadata(uuid, this.stillsRepository);
  }

  async checkIfFileExists(file: Express.Multer.File): Promise<boolean> {
    return this.mediaService.checkIfFileExists(file, this.stillsRepository);
  }

  /**
   * saves an image in orignal and compressed format and makes an entry in the database
   * @param file file to be saved
   * @param position position of the file
   */
  async save(file: Express.Multer.File, position = -1) {
    const promise: Promise<string> = this.mediaService.hashFile(file);
    const watermark = '@Christoph Anton-Cornelius Bärtsch';

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
    this.compressImage(filePath, thumbnailPath).then(() => {
      Jimp.read(thumbnailPath)
        .then((image) => {
          const loadedImage = image;
          Jimp.loadFont(Jimp.FONT_SANS_16_WHITE).then((font) => {
            loadedImage.print(font, 10, 10, watermark).write(thumbnailPath);
          });
        })
        .catch((err) => {
          throw new InternalServerErrorException(err);
        });
    });
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
    this.mediaService.insertPosition(position, this.stillsRepository);
  }

  compressImage(path: string, output: string) {
    return this.mediaService.compressImage(path, output);
  }

  getAll(): Promise<Stills[]> {
    return this.mediaService.getAll(this.stillsRepository);
  }

  getAmount(amount: number): Promise<Stills[]> {
    return this.mediaService.getAmount(amount, this.stillsRepository);
  }

  amount(): Promise<number> {
    return this.mediaService.amount(this.stillsRepository);
  }

  getRange(start: number, end: number): Promise<Stills[]> {
    return this.mediaService.getRange(start, end, this.stillsRepository);
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
    return this.mediaService.reorder(uuid1, uuid2, this.stillsRepository);
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
    this.mediaService.insert(uuid, position, this.stillsRepository);
  }
}
