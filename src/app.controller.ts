import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'Documentation available under https://github.com/quiode/website-chris-backend#api-documentation';
  }
}
