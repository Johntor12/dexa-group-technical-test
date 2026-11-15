import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller.js';

@Module({ controllers: [EmployeesController], providers: [] })
export class EmployeesModule {}
