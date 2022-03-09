import { Constants } from 'src/constants';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Response,
  StreamableFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VideosService, VideoBody } from './videos.service';
import { Videos } from './videos.entity';
import { createReadStream, readFileSync } from 'fs';
import { join } from 'path';
import * as fs from 'fs';

@Controller('videos')
export class VideosController {
  constructor(private videosService: VideosService) {}

  @Get()
  async getAllMetaData(): Promise<Videos[]> {
    return this.videosService.getAll();
  }

  @Get('/:id')
  getVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Response({ passthrough: true }) res
  ): StreamableFile {
    res.set({
      'Content-Type': `video/${Constants.video_extension.replace('.', '')}`,
      'Content-Disposition': `attachment; filename="${id}${Constants.video_extension}"`,
    });
    return new StreamableFile(null);
  }

  @Get('/:id/:photo')
  getPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photo', ParseIntPipe) photo: number,
    @Response({ passthrough: true }) res
  ): StreamableFile {
    if (photo < 0 || photo >= 3) {
      throw new BadRequestException('Photo does not exist');
    }
    res.set({
      'Content-Type': `image/jpeg`,
      'Content-Disposition': `attachment; filename="${
        id
        // TODO
      }${Constants.image_extension}"`,
    });
    return new StreamableFile(null);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'video', maxCount: 1 },
        { name: 'picture1', maxCount: 1 },
        { name: 'picture2', maxCount: 1 },
        { name: 'picture3', maxCount: 1 },
        { name: 'metadata', maxCount: 1 },
      ],
      {
        dest: Constants.temp_upload_path,
        fileFilter: (req, file, cb) => {
          switch (file.fieldname) {
            case 'video':
              if (file.mimetype !== Constants.video_mimetype) {
                cb(new BadRequestException('Invalid video file'), false);
              } else {
                cb(null, true);
              }
              break;
            case 'picture1':
            case 'picture2':
            case 'picture3':
              if (file.mimetype !== Constants.image_mimetype) {
                cb(new BadRequestException('Invalid image file'), false);
              } else {
                cb(null, true);
              }
              break;
            case 'metadata':
              if (file.mimetype !== 'application/json') {
                cb(new BadRequestException('Invalid metadata file'), false);
              } else {
                cb(null, true);
              }
              break;
            default:
              cb(new BadRequestException('Invalid file'), false);
              break;
          }
        },
      }
    )
  )
  async createVideo(
    @UploadedFiles()
    files: {
      video?: Express.Multer.File[];
      picture1?: Express.Multer.File[];
      picture2?: Express.Multer.File[];
      picture3?: Express.Multer.File[];
      metadata?: Express.Multer.File[];
    }
  ) {
    if (
      !files.video ||
      !files.picture1 ||
      !files.picture2 ||
      !files.picture3 ||
      !files.metadata ||
      files.video.length !== 1 ||
      files.picture1.length !== 1 ||
      files.picture2.length !== 1 ||
      files.picture3.length !== 1 ||
      files.metadata.length !== 1
    ) {
      throw new BadRequestException('Invalid files');
    }
    const video = files.video[0];
    const picture1 = files.picture1[0];
    const picture2 = files.picture2[0];
    const picture3 = files.picture3[0];
    const metadata = files.metadata[0];
    const videoBody: VideoBody = JSON.parse(readFileSync(metadata.path).toString());
    return this.videosService
      .createVideo(videoBody, video, [picture1, picture2, picture3])
      .then((video) => {
        fs.rmSync(metadata.path, { recursive: true, force: true });
        return video;
      });
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  async replaceVideos(@Body() body: { id: string; position: number }[]) {
    return 'This action replaces all positions';
  }

  @Delete('/:id')
  @UseGuards(JwtAuthGuard)
  async deleteVideo(@Param('id', ParseUUIDPipe) id: string) {
    return `This action removes a #id video`;
  }
}
