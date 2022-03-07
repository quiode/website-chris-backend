import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
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
  async createVideo() {
    return 'This action creates a new video';
  }
}
