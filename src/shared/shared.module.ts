import { Module } from '@nestjs/common';
import { ProgressController } from './progress/progress.controller';
import { ProgressService } from './progress/progress.service';
import { MediaService } from './media/media.service';

@Module({
  controllers: [ProgressController],
  providers: [ProgressService, MediaService],
  exports: [ProgressService, MediaService],
})
export class SharedModule {}
