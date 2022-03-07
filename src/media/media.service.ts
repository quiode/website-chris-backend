import {
  Repository,
  LessThan,
  Between,
  MoreThanOrEqual,
  Entity,
  Connection,
  EntityTarget,
} from 'typeorm';
import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { join } from 'path';
import Jimp = require('jimp');
import { Stills } from 'src/stills/stills.entity';
import { Videos } from 'src/videos/videos.entity';
import { Music } from 'src/music/music.entity';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { basename, extname } from 'path';
import { Constants } from '../constants';

@Injectable()
export class MediaService {
  constructor(private connection: Connection) {}

  async checkIfUUIDExists(uuid: string, repository: Repository<Stills | Videos | Music>) {
    const result = await repository.findOne({ where: { id: uuid } });
    if (!result) {
      throw new NotFoundException('UUID not found');
    }
    return true;
  }

  /**
   * retrieves the data stored in the database of a still
   * @param uuid the uuid of the image
   * @returns the stored data of the given uuid
   */
  getMetadata(uuid: string, repository: Repository<Stills | Videos | Music>): Promise<any> {
    return repository.findOne({ where: { id: uuid } });
  }

  async checkIfFileExists(
    file: Express.Multer.File,
    repository: Repository<Stills | Videos | Music>
  ): Promise<boolean> {
    const promise: Promise<string> = this.hashFile(file);

    const hash = await promise;

    const identicalFiles = repository.find({
      where: { hash: hash },
    });

    if ((await identicalFiles).length > 0) {
      return true;
    }

    return false;
  }

  hashFile(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(join(process.cwd(), file.path));
      stream.on('error', (err) => reject(err));
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  async compressImage(path: string, output: string) {
    try {
      const file = await Jimp.read(path);
      file.quality(60).resize(1080, Jimp.AUTO).write(output);

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  getAll(repository: Repository<Stills | Videos | Music>) {
    return repository.find({ order: { position: 'ASC' } });
  }

  getAmount(amount: number, repository: Repository<Stills | Videos | Music>) {
    return repository.find({
      where: { position: LessThan(amount) },
    });
  }

  amount(repository: Repository<Stills | Videos | Music>) {
    return repository.count();
  }

  getRange(start: number, end: number, repository: Repository<Stills | Videos | Music>) {
    return repository.find({
      where: { position: Between(start, end) },
    });
  }

  /**
   * moves all files with a position greater than the given position to the right so that the given position can be inserted
   * @param position position where the file should be inserted
   */
  async insertPosition(position: number, repository: Repository<Stills | Videos | Music>) {
    const stills = repository.find({
      where: { position: MoreThanOrEqual(position) },
    });

    (await stills).forEach(async (still) => {
      await repository.update({ id: still.id }, { position: still.position + 1 });
    });
  }

  /**
   * changes position of one still with another
   * @param uuid1
   * @param uuid2
   */
  async reorder(uuid1: string, uuid2: string, repository: Repository<Stills | Videos | Music>) {
    const still1 = await repository.findOne({
      where: { id: uuid1 },
    });
    const still2 = await repository.findOne({
      where: { id: uuid2 },
    });
    await repository.update({ id: uuid1 }, { position: -1 });
    await repository.update({ id: uuid2 }, { position: still1.position });
    await repository.update({ id: uuid1 }, { position: still2.position });
    return {
      still1: await repository.findOne({ where: { id: uuid1 } }),
      still2: await repository.findOne({ where: { id: uuid2 } }),
    };
  }

  async insert(uuid: string, position: number, repository: Repository<Stills | Videos | Music>) {
    const previousPosition = (await repository.findOne({ where: { id: uuid } })).position;
    if (previousPosition == position) {
      return;
    }
    await repository.update({ id: uuid }, { position: -1 });
    if (previousPosition < position) {
      const inBetweenValues = await repository.find({
        where: { position: Between(previousPosition, position) },
        order: { position: 'ASC' },
      });
      for (let i = 0; i < inBetweenValues.length; i++) {
        await repository.update(
          { id: inBetweenValues[i].id },
          { position: inBetweenValues[i].position - 1 }
        );
      }
    } else {
      const inBetweenValues = await repository.find({
        where: { position: Between(position, previousPosition) },
        order: { position: 'DESC' },
      });
      for (let i = 0; i < inBetweenValues.length; i++) {
        await repository.update(
          { id: inBetweenValues[i].id },
          { position: inBetweenValues[i].position + 1 }
        );
      }
    }
    await repository.update({ id: uuid }, { position: position });
  }

  async replace(
    body: { id: string; position: number }[],
    entity: EntityTarget<Stills | Videos | Music>
  ): Promise<boolean> {
    const queryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let iserror = false;
      for (let index = 0; index < body.length; index++) {
        const element = body[index];
        iserror =
          (await await queryRunner.manager.findOne(entity, {
            where: { id: element.id },
          })) === undefined;
      }
      if (iserror) {
        throw new InternalServerErrorException('Database operation failed');
      } else {
        for (let index = 0; index < body.length; index++) {
          const element = body[index];
          const still = await queryRunner.manager.findOne(entity, {
            where: { id: element.id },
          });
          const position = still.position;
          await queryRunner.manager.update(
            entity,
            { id: element.id },
            { position: (position + 1) * -1 }
          );
        }
        for (let index = 0; index < body.length; index++) {
          const element = body[index];
          await queryRunner.manager.update(
            entity,
            { id: element.id },
            { position: element.position }
          );
        }
      }
      await queryRunner.commitTransaction();
      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return false;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   *
   * @param path path to the file
   * @returns watermarks the file, resizes the file, safes it to a constant location and returns true on success
   */
  async waterMarkVideo(path: string) {
    try {
      const baseName = basename(path);
      const fileName = basename(path).split('.')[0];
      const ffmpeg = createFFmpeg();
      ffmpeg.setProgress((progress) => {
        console.log(progress);
      }); // TODO: disable in production
      await ffmpeg.load();
      ffmpeg.FS('writeFile', baseName + Constants.video_extension, await fetchFile(path));
      process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'; // TODO: disable in production
      ffmpeg.FS(
        'writeFile',
        fileName + '_watermark.png',
        await fetchFile('https://localhost:3000/public/VideoWaterMark.png')
      );
      await ffmpeg.run(
        '-i',
        baseName + Constants.video_extension,
        '-vf',
        'scale=1920:-1',
        baseName + '_resized' + Constants.video_extension
      );
      ffmpeg.FS('unlink', baseName + Constants.video_extension);
      await ffmpeg.run(
        '-i',
        baseName + '_resized' + Constants.video_extension,
        '-i',
        fileName + '_watermark.png',
        '-filter_complex',
        'overlay=10:10',
        baseName + Constants.video_extension
      );
      ffmpeg.FS('unlink', baseName + '_resized' + Constants.video_extension);
      fs.mkdirSync(Constants.videos_path, { recursive: true });
      fs.writeFileSync(
        Constants.videos_path + '/' + baseName + Constants.video_extension,
        ffmpeg.FS('readFile', baseName + Constants.video_extension)
      );
      ffmpeg.exit();
      fs.rmSync(path);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}
