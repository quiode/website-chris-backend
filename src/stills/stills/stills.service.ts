import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createReadStream, ReadStream } from 'fs';
import { join } from 'path/posix';
import { Repository } from 'typeorm';
import { Stills } from '../stills.entity';
import { Constants } from '../../constants';

@Injectable()
export class StillsService {
  constructor(@InjectRepository(Stills) private stillsRepository: Repository<Stills>) {}

  async checkIfUUIDExists(uuid: string) {
    const result = await this.stillsRepository.findOne({ where: { id: uuid } });
    if (!result) {
      throw new NotFoundException('UUID not found');
    }
    return true;
  }

  getOriginal(uuid: string): ReadStream {
    return createReadStream(
      join(process.cwd(), Constants.stills_path, uuid, Constants.image_extension)
    );
  }

  getThumbnail(uuid: string): ReadStream {
    return createReadStream(
      join(process.cwd(), Constants.stills_thumbnails_path, uuid, Constants.image_extension)
    );
  }

  getMetadata(uuid: string): Promise<Stills> {
    return this.stillsRepository.findOne({ where: { id: uuid } });
  }
}
