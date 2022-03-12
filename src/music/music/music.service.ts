import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MediaService } from 'src/media/media.service';
import { Repository } from 'typeorm';
import { Music } from '../music.entity';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { Constants } from '../../constants';

@Injectable()
export class MusicService {
  constructor(
    private mediaService: MediaService,
    @InjectRepository(Music) private stillsRepository: Repository<Music>
  ) {}

  checkIfUUIDExists(uuid: string) {
    return this.mediaService.checkIfUUIDExists(uuid, this.stillsRepository);
  }

  getAll() {
    return this.mediaService.getAll(this.stillsRepository);
  }

  async create(musicPost: { url: string; image: Express.Multer.File; song: Express.Multer.File }) {
    const music = new Music();
    music.url = musicPost.url;
    music.hash = await this.mediaService.hashFile(musicPost.song.path);
    music.id = randomUUID();
    music.pictureId = randomUUID();

    fs.mkdirSync(Constants.music_path, { recursive: true });
    fs.mkdirSync(Constants.music_images_path, { recursive: true });
    fs.copyFileSync(
      musicPost.song.path,
      Constants.music_path + '/' + music.id + Constants.music_extension
    );
    fs.copyFileSync(
      musicPost.image.path,
      Constants.music_images_path + '/' + music.pictureId + Constants.image_extension
    );
    fs.rmSync(musicPost.song.path, { recursive: true, force: true });
    fs.rmSync(musicPost.image.path, { recursive: true, force: true });

    let count = 0;
    while (count < 10) {
      count++;
      music.position = await this.stillsRepository.count();
      try {
        const save = await this.stillsRepository.save(music);
        return save;
      } catch (error) {
        continue;
      }
    }

    throw new InternalServerErrorException('Could not save music');
  }

  async checkIfSongExists(songPath: string) {
    const hash = await this.mediaService.hashFile(songPath);
    const result = await this.stillsRepository.findOne({ where: { hash: hash } });
    return result != undefined;
  }
}
