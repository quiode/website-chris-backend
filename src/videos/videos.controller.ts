import { Constants } from 'src/constants';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
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
import { join } from 'path';
import * as fs from 'fs';
import * as express from 'express';
import { UUID } from 'crypto';
import { ProgressService } from 'src/shared/progress/progress.service';

@Controller('videos')
export class VideosController {
  constructor(
    private videosService: VideosService,
    private progressService: ProgressService,
  ) {}

  @Get()
  async getAllMetaData(): Promise<Videos[]> {
    return this.videosService.getAll();
  }

  @Get('/:id')
  getVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: express.Response,
    @Req() req: express.Request,
  ) {
    try {
      fs.accessSync(
        join(Constants.videos_path, id + Constants.video_extension),
      );
    } catch (e) {
      throw new BadRequestException('Video not found');
    }
    const path = join(Constants.videos_path, id + Constants.video_extension);
    const stat = fs.statSync(path);
    const fileSize = stat.size;
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(path, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(path).pipe(res);
    }
  }

  @Get('/:id/:photo')
  getPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photo', ParseUUIDPipe) photo: string,
    @Response({ passthrough: true }) res: express.Response,
  ): StreamableFile {
    res.set({
      'Content-Type': `image/jpeg`,
      'Content-Disposition': `attachment; filename="${photo}${Constants.image_extension}"`,
    });
    try {
      fs.accessSync(
        join(Constants.videos_images_path, photo + Constants.image_extension),
      );
    } catch (e) {
      throw new BadRequestException('Image not found');
    }
    const file = fs.createReadStream(
      join(Constants.videos_images_path, photo + Constants.image_extension),
    );
    return new StreamableFile(file);
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
      },
    ),
  )
  /**
   * creates a video and returns the uuid of the progress event
   */
  createVideo(
    @UploadedFiles()
    files: {
      video?: Express.Multer.File[];
      picture1?: Express.Multer.File[];
      picture2?: Express.Multer.File[];
      picture3?: Express.Multer.File[];
    },
    @Body() videoBody: { metadata: string },
  ): { uuid: UUID } {
    if (
      !files.video ||
      !files.picture1 ||
      !files.picture2 ||
      !files.picture3 ||
      files.video.length !== 1 ||
      files.picture1.length !== 1 ||
      files.picture2.length !== 1 ||
      files.picture3.length !== 1
    ) {
      throw new BadRequestException('Invalid files');
    }
    const video = files.video[0];
    const picture1 = files.picture1[0];
    const picture2 = files.picture2[0];
    const picture3 = files.picture3[0];

    const progressUUID = this.progressService.registerNewProgress();

    this.videosService.createVideo(
      JSON.parse(videoBody.metadata) as VideoBody,
      video,
      [picture1, picture2, picture3],
      progressUUID,
    );

    return { uuid: progressUUID };
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  async replaceVideos(
    @Body()
    body: {
      id: string;
      position: number;
      line1: string;
      line2: string;
      url: string;
    }[],
  ) {
    if (await !this.videosService.replaceVideos(body)) {
      throw new BadRequestException('Invalid videos');
    }
    return this.videosService.getAll();
  }

  @Delete('/:id')
  @UseGuards(JwtAuthGuard)
  async deleteVideo(@Param('id', ParseUUIDPipe) id: string) {
    if (!(await this.videosService.exists(id))) {
      throw new BadRequestException('Video not found');
    }
    return this.videosService.removeVideo(id);
  }
}
