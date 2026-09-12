import { Injectable } from '@nestjs/common';
import { CharactersRepository } from './characters.repository.js';

@Injectable()
export class CharactersService {
  constructor(
    private readonly charactersRepository: CharactersRepository,
  ) {}

  async getCharacterByUserId(userId: string) {
    return this.charactersRepository.findByUserId(userId);
  }

  async ensureCharacter(userId: string) {
    return this.charactersRepository.findOrCreate(userId);
  }
}