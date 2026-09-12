import { Module } from '@nestjs/common';

import { CharactersRepository } from './characters.repository.js';
import { CharactersService } from './characters.service.js';

@Module({
  providers: [
    CharactersRepository,
    CharactersService,
  ],
  exports: [
    CharactersService,
  ],
})
export class CharactersModule {}