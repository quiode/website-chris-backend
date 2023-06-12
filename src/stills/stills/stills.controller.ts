import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Response,
  StreamableFile,
  UnsupportedMediaTypeException,
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
import { randomUUID } from 'crypto';
import { InternalServerErrorException, ParseUUIDPipe } from '@nestjs/common';

@Controller('stills')
export class StillsController {
  constructor(private stillsService: StillsService) {}

  @Get()
  getAll() {
    return this.stillsService.getAll();
  }

  @Get('amount')
  amount() {
    return this.stillsService.amount();
  }

  @Get('amount/:amount')
  getAmount(@Param('amount', ParseIntPipe) amount: number) {
    return this.stillsService.getAmount(amount);
  }

  @Get('amount/:from/:to')
  async getRange(
    @Param('from', ParseIntPipe) from: number,
    @Param('to', ParseIntPipe) to: number,
  ) {
    return this.stillsService.getRange(from, to);
  }

  @UseGuards(ExistingStillGuard)
  @Get('/:uuid')
  async getOriginal(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Response({ passthrough: true }) res,
  ) {
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
  async getThumbnail(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Response({ passthrough: true }) res,
  ) {
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
  @UseInterceptors(
    FileInterceptor('file', {
      dest: Constants.temp_upload_path,
      fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'image/jpeg') {
          cb(new BadRequestException('Only JPEG files are supported'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request,
  ) {
    if (file.mimetype !== 'image/jpeg') {
      throw new UnsupportedMediaTypeException('Only JPEG files are supported');
    }
    if (await this.stillsService.checkIfFileExists(file)) {
      throw new ConflictException('File already exists');
    }
    return this.stillsService.save(file);
  }

  /**
   * fully replaces all positions with the given positions
   */
  @Patch('replace')
  @UseGuards(JwtAuthGuard)
  async replace(@Body() body: { id: string; position: number }[]) {
    if (await this.stillsService.replace(body)) {
      return this.stillsService.getAll();
    } else {
      throw new InternalServerErrorException('Could not replace positions');
    }
  }

  // @Patch('/:uuid')
  // @UseGuards(JwtAuthGuard, ExistingStillGuard)
  // update(@Param('uuid') uuid: string, @Req() req: Request) {
  //   if (req.body.position != undefined) {
  //     return this.stillsService.update({ uuid, position: req.body.position });
  //   } else {
  //     throw new BadRequestException('Position is required');
  //   }
  // }

  // @Patch('/reoder/:uuid/:uuid2')
  // @UseGuards(JwtAuthGuard, ExistingStillGuard)
  // reorder(@Param('uuid') uuid: string, @Param('uuid2') uuid2: string) {
  //   return this.stillsService.reorder(uuid, uuid2);
  // }

  // @Patch('/insert/:uuid')
  // @UseGuards(JwtAuthGuard, ExistingStillGuard)
  // async insert(@Param('uuid') uuid: string, @Req() req: Request) {
  //   if (req.body.position != undefined) {
  //     await this.stillsService.insert(uuid, req.body.position);
  //   } else {
  //     throw new BadRequestException('Position is required');
  //   }

  //   return 'OK';
  // }

  @Delete('/:uuid')
  @UseGuards(JwtAuthGuard, ExistingStillGuard)
  async delete(@Param('uuid', ParseUUIDPipe) uuid: string) {
    this.stillsService.delete(uuid);
    return 'OK';
  }
}
