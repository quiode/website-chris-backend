import { Controller, Param, Sse } from '@nestjs/common';
import { UUID } from 'crypto';
import { ProgressService as ProgressService } from './progress.service';

@Controller('progress')
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  /**
   * get progress for provided uuid
   */
  @Sse(':uuid')
  getProgress(@Param('uuid') uuid: UUID) {
    return this.progressService.getProgress(uuid);
  }
}
