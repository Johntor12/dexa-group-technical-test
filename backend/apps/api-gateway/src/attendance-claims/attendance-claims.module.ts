import { Module } from '@nestjs/common';
import { AttendanceClaimsController } from './attendance-claims.controller.js';

@Module({ controllers: [AttendanceClaimsController] })
export class AttendanceClaimsModule {}
