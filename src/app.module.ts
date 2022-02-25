import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { VideosModule } from './videos/videos.module';
import { MusicModule } from './music/music.module';
import { StillsModule } from './stills/stills.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(),
    UsersModule,
    VideosModule,
    MusicModule,
    StillsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
