import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Multer } from 'multer';
import { Repository, Connection, MoreThanOrEqual } from 'typeorm';
import { Videos } from './videos.entity';
import { MediaService } from '../media/media.service';
import { Constants } from '../constants';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
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
    private mediaService: MediaService,
    private connection: Connection
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

  async removeVideo(videoId: string): Promise<Videos[]> {
    const images_urls = await this.videosRepository
      .findOne({ where: { id: videoId } })
      .then((video) => {
        return [video.picture1Id, video.picture2Id, video.picture3Id];
      });
    fs.rmSync(join(Constants.videos_path, videoId + Constants.video_extension), {
      force: true,
    });
    for (const image_url of images_urls) {
      fs.rmSync(join(Constants.videos_images_path, image_url + Constants.image_extension), {
        force: true,
      });
    }
    const biggerVideos = await this.videosRepository.find({
      where: {
        position: MoreThanOrEqual(
          await (
            await this.videosRepository.findOne({ where: { id: videoId } })
          ).position
        ),
      },
      order: { position: 'ASC' },
    });

    await this.videosRepository.delete({ id: videoId });

    for (const video of biggerVideos) {
      await this.videosRepository.update(video.id, { position: video.position - 1 });
    }

    return this.getAll();
  }

  async exists(videoId: string): Promise<boolean> {
    return this.videosRepository.findOne({ where: { id: videoId } }).then((video) => {
      return video !== undefined;
    });
  }

  async replaceVideos(
    body: { id: string; position: number; line1: string; line2: string; url: string }[]
  ) {
    if (body.length < (await this.videosRepository.count())) {
      return false;
    }
    const runner = this.connection.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      for (const video of body) {
        const videoData = await this.videosRepository.findOne({ where: { id: video.id } });
        await runner.manager.update(
          Videos,
          { id: video.id },
          {
            line1: video.line1,
            line2: video.line2,
            url: video.url,
            position: (videoData.position + 1) * -1,
          }
        );
      }
      for (const video of body) {
        await runner.manager.update(
          Videos,
          { id: video.id },
          {
            position: video.position,
          }
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
