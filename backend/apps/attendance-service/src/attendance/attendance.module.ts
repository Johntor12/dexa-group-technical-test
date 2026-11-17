import { Module } from '@nestjs/common';
import { Database } from '../../../../libs/common/src/database.js';
import { RpcClients } from '../../../../libs/common/src/rpc.js';
import { PhotoStorage } from '../../../../libs/common/src/storage.js';
import { AttendanceRepository } from './attendance.repository.js';
import { AttendanceService } from './attendance.service.js';
import { AutoCheckoutSweeper } from './auto-checkout-sweeper.service.js';
import { AttendanceMessageController } from './attendance.message-controller.js';
import { OrphanSweeper } from '../evidence/orphan-sweeper.service.js';
import { MissedCheckInClaimsService } from '../claims/missed-check-in-claims.service.js';
import { MissedCheckInClaimsMessageController } from '../claims/missed-check-in-claims.message-controller.js';
@Module({
  controllers: [AttendanceMessageController, MissedCheckInClaimsMessageController],
  providers: [
    Database,
    RpcClients,
    PhotoStorage,
    AttendanceRepository,
    AttendanceService,
    AutoCheckoutSweeper,
    OrphanSweeper,
    MissedCheckInClaimsService,
  ],
})
export class AttendanceModule {}
