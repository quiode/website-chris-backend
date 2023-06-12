import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  findOne(username: string): Promise<User | undefined> {
    return this.userRepository.findOne({
      where: { username: username },
    });
  }

  logLogin(id: number) {
    const date = new Date();
    this.userRepository.update(id, { lastLogin: date });
    return date;
  }

  async getLogin(id: number) {
    const user = await this.userRepository.findOneBy({ id: id });
    return user.lastLogin;
  }
}
