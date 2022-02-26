import { Test, TestingModule } from '@nestjs/testing';
import { StillsService } from './stills.service';

describe('StillsService', () => {
  let service: StillsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StillsService],
    }).compile();

    service = module.get<StillsService>(StillsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
