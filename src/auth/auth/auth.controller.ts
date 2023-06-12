import {
  BadRequestException,
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
import { Constants } from '../../constants';

@Controller('auth')
export class AuthController {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private authService: AuthService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('/login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Get('/signup/:username/:password')
  async signup(
    @Param('username') username: string,
    @Param('password') password: string,
  ) {
    if (Constants.prod) {
      throw new BadRequestException('Signup is disabled in production');
    } else {
      if (
        await this.userRepository.findOne({
          where: {
            username: username,
          },
        })
      ) {
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
}
