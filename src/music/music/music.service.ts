import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MediaService } from 'src/media/media.service';
import { Repository } from 'typeorm';
import { Music } from '../music.entity';

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
}
