import { Injectable } from '@nestjs/common';

import { CharactersService } from '../characters/characters.service.js';
import { UsersRepository } from './users.repository.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly charactersService: CharactersService,
  ) {}

  async syncUser(user: {
    uid: string;
    email?: string;
    name?: string;
    picture?: string;
  }) {
    const databaseUser =
      await this.usersRepository.upsert(
        user.uid,
        user.email ?? '',
        user.name ?? null,
        user.picture ?? null,
      );

    const character =
      await this.charactersService.ensureCharacter(
        databaseUser.id,
      );

    return {
      user: databaseUser,
      character,
    };
  }

  async getUserById(id: string) {
    return this.usersRepository.findById(id);
  }
}