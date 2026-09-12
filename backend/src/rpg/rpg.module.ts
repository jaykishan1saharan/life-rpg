import { Module } from '@nestjs/common';
import { RpgEngine } from './rpg.engine.js';

@Module({
  providers: [RpgEngine],
  exports: [RpgEngine],
})
export class RpgModule {}