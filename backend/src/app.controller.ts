import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from './database/database.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly database: DatabaseService,
  ) {}

  @Get()
  getStatus() {
    return {
      app: 'Life RPG',
      status: 'online',
    };
  }

  @Get('health/database')
  async databaseHealth() {
    const result = await this.database.query(
      'SELECT NOW() AS current_time',
    );

    return {
      database: 'connected',
      time: result.rows[0].current_time,
    };
  }
}