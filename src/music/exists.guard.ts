import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { MusicService } from './music/music.service';

@Injectable()
export class ExistsGuard implements CanActivate {
  constructor(private musicService: MusicService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return this.musicService.checkIfUUIDExists(
      context.switchToHttp().getRequest().params.uuid,
    );
  }
}
