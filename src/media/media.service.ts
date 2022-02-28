import { Repository, LessThan, Between, MoreThanOrEqual } from 'typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as sharp from 'sharp';
import { join } from 'path';
import { Stills } from 'src/stills/stills.entity';
import { Videos } from 'src/videos/videos.entity';
import { Music } from 'src/music/music.entity';

@Injectable()
export class MediaService {
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

  compressImage(path: string, output: string) {
    return sharp(path).jpeg({ quality: 40 }).resize(100).toFile(output);
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
}