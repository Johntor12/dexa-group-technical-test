import { Module } from '@nestjs/common';
import { AttendanceModule } from './attendance/attendance.module.js';
@Module({ imports: [AttendanceModule] })
export class AppModule {}
