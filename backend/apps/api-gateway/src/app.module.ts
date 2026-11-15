import { Module } from '@nestjs/common';
import { InfrastructureModule } from './common/infrastructure.module.js';
import { AuthModule } from './auth/auth.module.js';
import { EmployeesModule } from './employees/employees.module.js';
import { AttendanceModule } from './attendance/attendance.module.js';
import { AttendanceCorrectionsModule } from './attendance-corrections/attendance-corrections.module.js';
import { HealthController } from './health.controller.js';
@Module({
  imports: [
    InfrastructureModule,
    AuthModule,
    EmployeesModule,
    AttendanceModule,
    AttendanceCorrectionsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
