import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stills } from './stills.entity';
import { StillsController } from './stills/stills.controller';
import { StillsService } from './stills/stills.service';
import { ExistingStillGuard } from './not-found-still.guard';
import { MediaModule } from 'src/media/media.module';

@Module({
  imports: [TypeOrmModule.forFeature([Stills]), MediaModule],
  controllers: [StillsController],
  providers: [StillsService, ExistingStillGuard],
})
export class StillsModule {}
