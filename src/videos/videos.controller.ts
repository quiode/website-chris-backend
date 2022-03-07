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
import { VideosService } from './videos.service';
import { Videos } from './videos.entity';
import { createReadStream } from 'fs';
import { join } from 'path';

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
  async getPhoto(
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
    FileFieldsInterceptor([
      // TODO
    ])
  )
  async createVideo(
    @UploadedFiles()
    files: {
      // TODO
    }
  ) {
    return 'This action creates a new video';
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
