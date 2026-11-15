import { Injectable } from '@nestjs/common';
import { Database } from '../../../../libs/common/src/database.js';
@Injectable()
export class AttendanceRepository {
  constructor(private readonly database: Database) {}
  get db() {
    return this.database.client;
  }
}
