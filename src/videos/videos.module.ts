import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Videos } from './videos.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Videos])],
  controllers: [VideosController],
  providers: [VideosService],
})
export class VideosModule {}
