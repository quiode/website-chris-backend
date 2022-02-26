import { Module } from '@nestjs/common';
import { StillsController } from './stills/stills.controller';

@Module({
  controllers: [StillsController]
})
export class StillsModule {}
