import { Injectable } from '@nestjs/common';
import { UUID, randomUUID } from 'crypto';
import { Observable, Subject } from 'rxjs';

export enum ProgressType {
  IMAGE_CONVERT = 'Converting Image',
  VIDEO_CONVERT = 'Converting Video',
  WATERMARKING_VIDEO = 'Watermarking Video',
  HASH_VIDEO = 'Hashing Video',
  FINISHED = 'Finished',
}

export interface MessageEvent {
  data: string | object;
  id?: string;
  type?: string;
  retry?: number;
}

export interface ProgressEvent extends MessageEvent {
  data: {
    progress: number;
    type: ProgressType;
  };
}

@Injectable()
export class ProgressService {
  private progressCache = new Map<UUID, Subject<ProgressEvent>>();

  /**
   * Creates a new ProgressSuject and saves it in the cache
   */
  registerNewProgress(): UUID {
    const newUUID = randomUUID();
    const newSubject = new Subject<ProgressEvent>();

    // on complete, delete from cache
    newSubject.subscribe({
      next: (progress) => {
        // console.debug(progress)
      },
      complete: () => this.progressCache.delete(newUUID),
      error: () => this.progressCache.delete(newUUID),
    });

    this.progressCache.set(newUUID, newSubject);

    return newUUID;
  }

  /**
   * gets a progress subject for the uuid if it exists, else returns a completed subject
   */
  getProgress(uuid: UUID): Observable<ProgressEvent> {
    if (this.progressCache.has(uuid)) {
      return this.progressCache.get(uuid);
    } else {
      const completedSubject = new Subject<ProgressEvent>();
      completedSubject.complete();

      return completedSubject.asObservable();
    }
  }

  /**
   * calls next for the progress with the event, if it exists
   */
  nextProgress(uuid: UUID, event: ProgressEvent) {
    if (this.progressCache.has(uuid)) {
      this.progressCache.get(uuid).next(event);
    }
  }

  /**
   * completes a progress and removes if from the cache
   */
  completeProgress(uuid: UUID) {
    if (this.progressCache.has(uuid)) {
      this.progressCache.get(uuid).next({
        type: 'close',
        data: { progress: 100, type: ProgressType.FINISHED },
      });
      this.progressCache.get(uuid).complete();
      this.progressCache.delete(uuid);
    }
  }
}
