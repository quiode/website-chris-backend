import {
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Response,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Constants } from 'src/constants';
import { StillsService } from './stills.service';
import { ExistingStillGuard } from '../not-found-still.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { count } from 'console';

@Controller('stills')
export class StillsController {
  constructor(private stillsService: StillsService) {}

  @Get()
  async getAll() {
    return this.stillsService.getAll();
  }

  @Get('amount')
  amount() {
    return this.stillsService.amount();
  }

  @Get('amount/:amount')
  getAmount(@Param('amount') amount: number) {
    return this.stillsService.getAmount(amount);
  }

  @Get('amount/:from/:to')
  async getRange(@Param('from') from: number, @Param('to') to: number) {
    return this.stillsService.getRange(from, to);
  }

  @UseGuards(ExistingStillGuard)
  @Get('/:uuid')
  async getOriginal(@Param('uuid') uuid: string, @Response({ passthrough: true }) res) {
    const file = this.stillsService.getOriginal(uuid);
    const metadata = await this.stillsService.getMetadata(uuid);
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `attachment; filename="${uuid}.${Constants.image_extension}"`,
      uuid: metadata.id,
      position: metadata.position,
      hash: metadata.hash,
    });
    return new StreamableFile(file);
  }

  @UseGuards(ExistingStillGuard)
  @Get('/:uuid/thumbnail')
  async getThumbnail(@Param('uuid') uuid: string, @Response({ passthrough: true }) res) {
    const file = this.stillsService.getThumbnail(uuid);
    const metadata = await this.stillsService.getMetadata(uuid);
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `attachment; filename="${uuid}.${Constants.image_extension}"`,
      uuid: metadata.id,
      position: metadata.position,
      hash: metadata.hash,
    });
    return new StreamableFile(file);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { dest: Constants.temp_upload_path }))
  async upload(@UploadedFile() file: Express.Multer.File, @Req() request: Request) {
    if (file.mimetype !== 'image/jpeg') {
      throw new BadRequestException('Only JPEG files are supported');
    }
    if (await this.stillsService.checkIfFileExists(file)) {
      throw new ConflictException('File already exists');
    }
    if (request.body.position != undefined) {
      return this.stillsService.save(file, request.body.position);
    }
    return this.stillsService.save(file);
  }
}
