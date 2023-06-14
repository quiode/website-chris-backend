import { Module } from '@nestjs/common';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Videos } from './videos.entity';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([Videos]), SharedModule],
  controllers: [VideosController],
  providers: [VideosService],
})
export class VideosModule {}
