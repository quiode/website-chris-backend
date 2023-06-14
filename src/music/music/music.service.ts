import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MediaService } from 'src/shared/media/media.service';
import { Repository, Connection } from 'typeorm';
import { Music } from '../music.entity';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { Constants } from '../../constants';

@Injectable()
export class MusicService {
  constructor(
    private mediaService: MediaService,
    @InjectRepository(Music) private musicRepository: Repository<Music>,
    private connection: Connection,
  ) {}

  checkIfUUIDExists(uuid: string) {
    return this.mediaService.checkIfUUIDExists(uuid, this.musicRepository);
  }

  getAll() {
    return this.mediaService.getAll(this.musicRepository);
  }

  async create(musicPost: {
    url: string;
    image: Express.Multer.File;
    song: Express.Multer.File;
  }) {
    const music = new Music();
    music.url = musicPost.url;
    music.hash = await this.mediaService.hashFile(musicPost.song.path);
    music.id = randomUUID();
    music.pictureId = randomUUID();

    fs.mkdirSync(Constants.music_path, { recursive: true });
    fs.mkdirSync(Constants.music_images_path, { recursive: true });
    fs.copyFileSync(
      musicPost.song.path,
      Constants.music_path + '/' + music.id + Constants.music_extension,
    );
    fs.copyFileSync(
      musicPost.image.path,
      Constants.music_images_path +
        '/' +
        music.pictureId +
        Constants.image_extension,
    );
    fs.rmSync(musicPost.song.path, { recursive: true, force: true });
    fs.rmSync(musicPost.image.path, { recursive: true, force: true });

    let count = 0;
    while (count < 10) {
      count++;
      music.position = await this.musicRepository.count();
      try {
        const save = await this.musicRepository.save(music);
        return save;
      } catch (error) {
        continue;
      }
    }

    throw new InternalServerErrorException('Could not save music');
  }

  async checkIfSongExists(songPath: string) {
    const hash = await this.mediaService.hashFile(songPath);
    const result = await this.musicRepository.findOne({
      where: { hash: hash },
    });
    return result != undefined;
  }

  async getAudio(id: string) {
    const item = await this.musicRepository.findOne({ where: { id: id } });
    if (item == undefined) {
      throw new NotFoundException('Music not found');
    }
    return fs.createReadStream(
      Constants.music_path + '/' + item.id + Constants.music_extension,
    );
  }

  async getImage(id: string) {
    const item = await this.musicRepository.findOne({ where: { id: id } });
    if (item == undefined) {
      throw new NotFoundException('Image not found');
    }
    return fs.createReadStream(
      Constants.music_images_path +
        '/' +
        item.pictureId +
        Constants.image_extension,
    );
  }

  async delete(id: string) {
    const item = await this.musicRepository.findOne({ where: { id: id } });
    if (item == undefined) {
      throw new NotFoundException('Music not found');
    }
    fs.rmSync(
      Constants.music_path + '/' + item.id + Constants.music_extension,
      {
        recursive: true,
        force: true,
      },
    );
    fs.rmSync(
      Constants.music_images_path +
        '/' +
        item.pictureId +
        Constants.image_extension,
      {
        recursive: true,
        force: true,
      },
    );
    await this.musicRepository.delete({ id: id });
  }

  async replaceMusic(body: { id: string; position: number; url: string }[]) {
    if (body.length < (await this.musicRepository.count())) {
      throw new BadRequestException('Not enough music');
    }
    const runner = this.connection.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      for (const video of body) {
        const videoData = await this.musicRepository.findOne({
          where: { id: video.id },
        });
        await runner.manager.update(
          Music,
          { id: video.id },
          {
            url: video.url,
            position: (videoData.position + 1) * -1,
          },
        );
      }
      for (const video of body) {
        await runner.manager.update(
          Music,
          { id: video.id },
          {
            position: video.position,
          },
        );
      }
      await runner.commitTransaction();
      await runner.release();
      return true;
    } catch (e) {
      await runner.rollbackTransaction();
      await runner.release();
      return false;
    }
  }
}
