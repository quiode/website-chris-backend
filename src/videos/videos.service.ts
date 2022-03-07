import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Videos } from './videos.entity';

@Injectable()
export class VideosService {
  constructor(@InjectRepository(Videos) private videosRepository: Repository<Videos>) {}

  getAll(): Promise<Videos[]> {
    return this.videosRepository.find();
  }
}
