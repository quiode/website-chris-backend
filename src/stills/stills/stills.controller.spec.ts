import { Test, TestingModule } from '@nestjs/testing';
import { StillsController } from './stills.controller';

describe('StillsController', () => {
  let controller: StillsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StillsController],
    }).compile();

    controller = module.get<StillsController>(StillsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
