import {
  Repository,
  LessThan,
  Between,
  MoreThanOrEqual,
  Connection,
  EntityTarget,
} from 'typeorm';
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { join } from 'path';
import Jimp = require('jimp');
import { Stills } from 'src/stills/stills.entity';
import { Videos } from 'src/videos/videos.entity';
import { Music } from 'src/music/music.entity';
import { Constants } from '../../constants';
import Ffmpeg = require('fluent-ffmpeg');
import { Subject } from 'rxjs';
import { VideoUploadEvent } from 'src/videos/videos.service';
import {
  ProgressService,
  ProgressType,
} from 'src/shared/progress/progress.service';

@Injectable()
export class MediaService {
  constructor(
    private connection: Connection,
    private progressService: ProgressService,
  ) {}

  async checkIfUUIDExists(
    uuid: string,
    repository: Repository<Stills | Videos | Music>,
  ) {
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
  getMetadata(
    uuid: string,
    repository: Repository<Stills | Videos | Music>,
  ): Promise<any> {
    return repository.findOne({ where: { id: uuid } });
  }

  async checkIfFileExists(
    file: Express.Multer.File,
    repository: Repository<Stills | Videos | Music>,
  ): Promise<boolean> {
    const promise: Promise<string> = this.hashFile(file.path);

    const hash = await promise;

    const identicalFiles = repository.find({
      where: { hash: hash },
    });

    if ((await identicalFiles).length > 0) {
      return true;
    }

    return false;
  }

  hashFile(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(join(process.cwd(), path));
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
      // console.error(error);
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

  getRange(
    start: number,
    end: number,
    repository: Repository<Stills | Videos | Music>,
  ) {
    return repository.find({
      where: { position: Between(start, end) },
    });
  }

  /**
   * moves all files with a position greater than the given position to the right so that the given position can be inserted
   * @param position position where the file should be inserted
   */
  async insertPosition(
    position: number,
    repository: Repository<Stills | Videos | Music>,
  ) {
    const stills = repository.find({
      where: { position: MoreThanOrEqual(position) },
    });

    (await stills).forEach(async (still) => {
      await repository.update(
        { id: still.id },
        { position: still.position + 1 },
      );
    });
  }

  /**
   * changes position of one still with another
   * @param uuid1
   * @param uuid2
   */
  async reorder(
    uuid1: string,
    uuid2: string,
    repository: Repository<Stills | Videos | Music>,
  ) {
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

  async insert(
    uuid: string,
    position: number,
    repository: Repository<Stills | Videos | Music>,
  ) {
    const previousPosition = (await repository.findOne({ where: { id: uuid } }))
      .position;
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
          { position: inBetweenValues[i].position - 1 },
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
          { position: inBetweenValues[i].position + 1 },
        );
      }
    }
    await repository.update({ id: uuid }, { position: position });
  }

  async replace(
    body: { id: string; position: number }[],
    entity: EntityTarget<Stills | Videos | Music>,
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
            { position: (position + 1) * -1 },
          );
        }
        for (let index = 0; index < body.length; index++) {
          const element = body[index];
          await queryRunner.manager.update(
            entity,
            { id: element.id },
            { position: element.position },
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
  async waterMarkVideo(
    path: string,
    output: string,
    newFileName: string,
    progressUUID?: crypto.UUID,
  ) {
    const resizing = await new Promise<boolean>((resolve, reject) => {
      const temp_output = join(
        process.cwd(),
        Constants.temp_upload_path,
        newFileName + Constants.video_extension,
      );
      fs.mkdirSync(Constants.videos_path, { recursive: true });
      Ffmpeg(path)
        .on('progress', (progress) => {
          if (progressUUID)
            this.progressService.nextProgress(progressUUID, {
              data: {
                progress: progress.percent,
                type: ProgressType.VIDEO_CONVERT,
              },
            });
        })
        .size('1920x?')
        .toFormat(Constants.video_extension.replace('.', ''))
        .save(temp_output)
        .on('error', (error) => {
          console.error(error);
          fs.rmSync(path);
          fs.rmSync(temp_output);
          reject(false);
        })
        .on('end', () => {
          fs.rmSync(path);
          resolve(true);
        });
    });
    if (resizing) {
      const overlay = await new Promise<boolean>((resolve, reject) => {
        const input = join(
          process.cwd(),
          Constants.temp_upload_path,
          newFileName + Constants.video_extension,
        );
        const outputPath = join(
          output,
          newFileName + Constants.video_extension,
        );
        const command = Ffmpeg(input);
        command
          .on('progress', (progress) => {
            if (progressUUID)
              this.progressService.nextProgress(progressUUID, {
                data: {
                  progress: progress.percent,
                  type: ProgressType.WATERMARKING_VIDEO,
                },
              });
          })
          .input(join(process.cwd(), 'public/VideoWaterMark.png'))
          .complexFilter({
            filter: 'overlay',
            options: { x: 10, y: 10 },
          })
          .on('error', (error) => {
            console.error(error);
            fs.rmSync(input);
            fs.rmSync(outputPath);
            reject(false);
          })
          .on('end', () => {
            fs.rmSync(input);
            resolve(true);
          })
          .save(outputPath);
      });
      if (overlay) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  async waterMarkImage(
    path: string,
    output: string,
    newFileName: string,
    progressSubject?: Subject<VideoUploadEvent>,
  ) {
    const watermark = '@Christoph  Bärtsch';
    progressSubject?.next({
      data: {
        progress: 20,
        type: 'Watermarking Image',
      },
    });
    fs.mkdirSync(output, { recursive: true });
    const result = await this.compressImage(path, join(output, newFileName));
    // add watermark
    const font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

    const loadedImage = await Jimp.read(join(output, newFileName));
    await loadedImage
      .print(font, 10, 10, watermark)
      .writeAsync(join(output, newFileName + Constants.image_extension));

    fs.rmSync(join(output, newFileName), { recursive: true, force: true });
    fs.rmSync(path, { recursive: true, force: true });
    progressSubject?.next({
      data: {
        progress: 100,
        type: 'Watermarking Image',
      },
    });
    return result;
  }
}
