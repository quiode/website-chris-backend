import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Music } from '../music.entity';
import { MusicService } from './music.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Constants } from '../../constants';
import { Response } from 'express';
import { StreamableFile } from '@nestjs/common';

@Controller('music')
export class MusicController {
  constructor(private readonly musicService: MusicService) {}

  @Get()
  getAll() {
    return this.musicService.getAll();
  }

  @Get('/:id')
  async getAudio(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile> {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename=${id}.mp3`);
    if (!(await this.musicService.checkIfUUIDExists(id))) {
      throw new BadRequestException('Song not found');
    }
    const audio = await this.musicService.getAudio(id);
    return new StreamableFile(audio);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'song', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
      ],
      {
        dest: Constants.temp_upload_path,
        fileFilter: (req, file, callback) => {
          switch (file.fieldname) {
            case 'song':
              if (file.mimetype !== 'audio/mpeg') {
                callback(new BadRequestException('Invalid song file'), false);
              } else {
                callback(null, true);
              }
              break;
            case 'cover':
              if (file.mimetype !== 'image/jpeg') {
                callback(new BadRequestException('Invalid cover file'), false);
              } else {
                callback(null, true);
              }
              break;
            default:
              break;
          }
        },
      }
    )
  )
  async create(
    @UploadedFiles() files: { song?: Express.Multer.File[]; cover?: Express.Multer.File[] },
    @Body() url: { url: string }
  ): Promise<Music> {
    if (files.song == undefined || files.cover == undefined) {
      throw new BadRequestException('Invalid files');
    }
    if (await this.musicService.checkIfSongExists(files.song[0].path)) {
      throw new ConflictException('Song already exists');
    }
    return this.musicService.create({
      url: url.url,
      song: files.song[0],
      image: files.cover[0],
    });
  }
}
