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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('videos')
export class VideosController {
  @Get()
  async getAllMetaData() {
    return 'This action returns all videos';
  }

  @Get('/:id')
  async getVideo(@Param('id', ParseUUIDPipe) id: string) {
    return 'This action returns a #id video (metadata in headers)';
  }

  @Get('/:id/:photo')
  async getPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photo', ParseIntPipe) photo: number
  ) {
    if (photo < 0 || photo >= 3) {
      throw new BadRequestException('Photo does not exist');
    }
    return `This action returns a #id photo (metadata in headers)`;
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
