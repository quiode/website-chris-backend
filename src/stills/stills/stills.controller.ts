import { Controller, Get, Param, Response, StreamableFile, UseGuards } from '@nestjs/common';
import { Constants } from 'src/constants';
import { StillsService } from './stills.service';
import { ExistingStillGuard } from '../not-found-still.guard';

@Controller('stills')
export class StillsController {
  constructor(private stillsService: StillsService) {}

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
}
