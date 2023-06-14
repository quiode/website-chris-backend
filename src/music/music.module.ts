import { Music } from './music.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExistsGuard } from './exists.guard';
import { MusicController } from './music/music.controller';
import { MusicService } from './music/music.service';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([Music])],
  controllers: [MusicController],
  providers: [MusicService, ExistsGuard],
  exports: [TypeOrmModule],
})
export class MusicModule {}
