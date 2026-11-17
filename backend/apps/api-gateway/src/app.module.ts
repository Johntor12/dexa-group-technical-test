import { Module } from '@nestjs/common';
import { InfrastructureModule } from './common/infrastructure.module.js';
import { AuthModule } from './auth/auth.module.js';
import { EmployeesModule } from './employees/employees.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { AttendanceClaimsModule } from './attendance-claims/attendance-claims.module.js';
import { HealthController } from './health.controller.js';
@Module({
  imports: [
    InfrastructureModule,
    AuthModule,
    EmployeesModule,
    AttendanceModule,
    AttendanceClaimsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
