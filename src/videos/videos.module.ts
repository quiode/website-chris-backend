import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller';

@Module({
  controllers: [VideosController]
})
export class VideosModule {}
