import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller.js';

@Module({ controllers: [AttendanceController], providers: [] })
export class AttendanceModule {}
