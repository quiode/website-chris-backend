import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Multer } from 'multer';
import { Repository } from 'typeorm';
import { Videos } from './videos.entity';
import { MediaService } from '../media/media.service';
import { Constants } from '../constants';
import { randomUUID } from 'crypto';

export interface VideoBody {
  url: string;
  line1: string;
  line2: string;
}

export interface VideoData extends VideoBody {
  id: string;
  hash: string;
  position: number;
  picture1Id: string;
  picture2Id: string;
  picture3Id: string;
}

@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(Videos) private videosRepository: Repository<Videos>,
    private mediaService: MediaService
  ) {}

  getAll(): Promise<Videos[]> {
    return this.videosRepository.find();
  }

  async createVideo(
    videoBody: VideoBody,
    video: Express.Multer.File,
    images: Express.Multer.File[]
  ): Promise<Videos> {
    // TODO: add watermark to video
    const videoUUID = randomUUID();
    if (!(await this.mediaService.waterMarkVideo(video.path, Constants.videos_path, videoUUID))) {
      throw new InternalServerErrorException('Could not watermark video');
    }
    // TODO: add watermark to images
    // TODO: save video
    // TODO: save images
    // TODO: save metadata
    // On error: delete video, images and metadata
    return null;
  }
}
