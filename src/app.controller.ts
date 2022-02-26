import {
  ConflictException,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppService } from './app.service';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './users/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LocalAuthGuard } from './auth/local-auth.guard';
import { AuthService } from './auth/auth/auth.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectRepository(User) private userRepository: Repository<User>,
    private authService: AuthService
  ) {}

  @Get()
  getHello(): string {
    return 'Documentation available under https://github.com/quiode/website-chris-backend#api-documentation';
  }

  @UseGuards(LocalAuthGuard)
  @Post('auth/login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  // TODO: This is a debug endpoint, remove it before production
  @Get('auth/signup/:username/:password')
  async signup(@Param('username') username: string, @Param('password') password: string) {
    if (await this.userRepository.findOne({ username: username })) {
      throw new ConflictException('User already exists');
    }
    await this.userRepository.save({
      username: username,
      password: await bcrypt.hash(password, bcrypt.genSaltSync(10)),
      lastLogin: new Date(),
    });
    return 'User created';
  }
}
