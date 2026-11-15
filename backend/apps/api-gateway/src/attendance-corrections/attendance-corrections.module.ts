import { Module } from '@nestjs/common';
import { AttendanceCorrectionsController } from './attendance-corrections.controller.js';
@Module({ controllers: [AttendanceCorrectionsController] })
export class AttendanceCorrectionsModule {}
