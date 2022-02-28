import { Music } from './music.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaModule } from 'src/media/media.module';
import { ExistsGuard } from './exists.guard';
import { MusicController } from './music/music.controller';
import { MusicService } from './music/music.service';

@Module({
  imports: [MediaModule, TypeOrmModule.forFeature([Music])],
  controllers: [MusicController],
  providers: [MusicService, ExistsGuard],
  exports: [TypeOrmModule],
})
export class MusicModule {}
