import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { StillsService } from './stills/stills.service';

@Injectable()
export class ExistingStillGuard implements CanActivate {
  constructor(private stillsService: StillsService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const result = this.stillsService.checkIfUUIDExists(
      context.switchToHttp().getRequest().params.uuid
    );
    return result;
  }
}
