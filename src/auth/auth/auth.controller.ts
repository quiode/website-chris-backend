import {
  ConflictException,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/user.entity';
import { Repository } from 'typeorm';
import { LocalAuthGuard } from '../local-auth.guard';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private authService: AuthService
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('/login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  // TODO: This is a debug endpoint, remove it before production
  @Get('/signup/:username/:password')
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
