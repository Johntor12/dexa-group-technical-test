import { Module } from '@nestjs/common';
import { Database } from '../../../../libs/common/src/database.js';
import { EmployeesRepository } from './employees.repository.js';
import { EmployeesService } from './employees.service.js';
import { CredentialsService } from '../credentials/credentials.service.js';
import { EmployeesMessageController } from './employees.message-controller.js';
@Module({
  controllers: [EmployeesMessageController],
  providers: [
    Database,
    EmployeesRepository,
    EmployeesService,
    CredentialsService,
  ],
})
export class EmployeesModule {}
