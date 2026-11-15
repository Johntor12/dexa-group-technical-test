import { Module } from '@nestjs/common';
import { Database } from '../../../../libs/common/src/database.js';
import { RpcClients } from '../../../../libs/common/src/rpc.js';
import { PhotoStorage } from '../../../../libs/common/src/storage.js';
import { AttendanceRepository } from './attendance.repository.js';
import { AttendanceService } from './attendance.service.js';
import { AttendanceMessageController } from './attendance.message-controller.js';
import { OrphanSweeper } from '../evidence/orphan-sweeper.service.js';
import { CorrectionsService } from '../corrections/corrections.service.js';
import { CorrectionsMessageController } from '../corrections/corrections.message-controller.js';
@Module({
  controllers: [AttendanceMessageController, CorrectionsMessageController],
  providers: [
    Database,
    RpcClients,
    PhotoStorage,
    AttendanceRepository,
    AttendanceService,
    OrphanSweeper,
    CorrectionsService,
  ],
})
export class AttendanceModule {}
