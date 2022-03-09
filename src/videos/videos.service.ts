import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Multer } from 'multer';
import { Repository } from 'typeorm';
import { Videos } from './videos.entity';
import { MediaService } from '../media/media.service';
import { Constants } from '../constants';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import path from 'path';
import { join } from 'path';

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
    const videoUUID = randomUUID();
    const imageUUIDS: string[] = [];
    if (!(await this.mediaService.waterMarkVideo(video.path, Constants.videos_path, videoUUID))) {
      this.videoErrorCleanup(videoUUID, imageUUIDS);
      throw new InternalServerErrorException('Could not watermark video');
    }
    // TODO: add watermark to images
    for await (const image of images) {
      const imageUUID = randomUUID();
      imageUUIDS.push(imageUUID);
      if (
        !(await this.mediaService.waterMarkImage(
          image.path,
          Constants.videos_images_path,
          imageUUID
        ))
      ) {
        this.videoErrorCleanup(videoUUID, imageUUIDS);
        throw new InternalServerErrorException('Could not watermark image');
      }
    }
    const videoData = new Videos();
    videoData.id = videoUUID;
    videoData.hash = await this.mediaService.hashFile(
      join(Constants.videos_path, videoUUID + Constants.video_extension)
    );
    const hasOne = await this.videosRepository.findOne({ where: { hash: videoData.hash } });
    if (hasOne) {
      this.videoErrorCleanup(videoUUID, imageUUIDS);
      throw new InternalServerErrorException('Video already exists');
    }
    videoData.picture1Id = imageUUIDS[0];
    videoData.picture2Id = imageUUIDS[1];
    videoData.picture3Id = imageUUIDS[2];
    videoData.line1 = videoBody.line1;
    videoData.line2 = videoBody.line2;
    videoData.url = videoBody.url;

    let counter = 0;
    while (true) {
      videoData.position = await this.videosRepository.count();
      try {
        await this.videosRepository.save(videoData);
        break;
      } catch (e) {
        if (counter > 10) {
          this.videoErrorCleanup(videoUUID, imageUUIDS);
          throw new InternalServerErrorException('Could not save video');
        }
        counter++;
      }
    }
    return this.videosRepository.findOne({ where: { id: videoUUID } });
  }

  private videoErrorCleanup(videoUUID: string, imageUUIDS: string[]) {
    fs.rmSync(join(Constants.videos_path, videoUUID + Constants.video_extension), {
      force: true,
      recursive: true,
    });

    for (const imageUUID of imageUUIDS) {
      fs.rmSync(join(Constants.videos_images_path, imageUUID + Constants.image_extension), {
        force: true,
        recursive: true,
      });
    }
  }
}
