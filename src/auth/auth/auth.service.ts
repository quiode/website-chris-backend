import { HttpCode, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from 'src/users/users/users.service';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../jwt.strategy';

export interface UserInterface {
  id: number;
  username: string;
  lastLogin: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService
  ) {}

  async validateUser(username: string, password: string): Promise<UserInterface> {
    const user = await this.usersService.findOne(username);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      const lastLogin = this.usersService.logLogin(user.id);
      return {
        username: user.username,
        id: user.id,
        lastLogin: lastLogin,
      };
    }
    throw new HttpException('Invalid Password', HttpStatus.FORBIDDEN);
  }

  async login(user: UserInterface) {
    const payload: JwtPayload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
