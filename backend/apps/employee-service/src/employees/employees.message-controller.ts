import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CredentialsService } from '../credentials/credentials.service.js';
import { EmployeesService } from './employees.service.js';
import { Database } from '../../../../libs/common/src/database.js';
import { verifyEnvelope } from '../../../../libs/common/src/rpc.js';
import { rpcResult } from '../../../../libs/common/src/errors.js';
import { validated } from '../../../../libs/common/src/validation.js';
import {
  LoginDto,
  ActivateAccountDto,
  CreateEmployeeDto,
  UpdateEmployeeDto,
  ListDto,
  IdDto,
} from '../../../../libs/contracts/src/dto.js';
import { patterns as P } from '../../../../libs/contracts/src/contracts.js';
import type { Envelope } from '../../../../libs/contracts/src/contracts.js';
@Controller()
export class EmployeesMessageController {
  constructor(
    private readonly credentials: CredentialsService,
    private readonly employees: EmployeesService,
    private readonly db: Database,
  ) {}
  @MessagePattern(P.login) login(@Payload() e: Envelope) {
    return rpcResult(async () => {
      verifyEnvelope(e);
      const d = validated(LoginDto, e.data);
      return this.credentials.login(d.email, d.password);
    });
  }
  @MessagePattern(P.activate) activate(@Payload() e: Envelope) {
    return rpcResult(async () => {
      verifyEnvelope(e);
      const d = validated(ActivateAccountDto, e.data);
      return this.credentials.activate(d.token, d.password);
    });
  }
  @MessagePattern(P.identity) identity(@Payload() e: Envelope) {
    return rpcResult(async () => {
      verifyEnvelope(e);
      return this.credentials.identity(e.token);
    });
  }
  @MessagePattern(P.logout) logout(@Payload() e: Envelope) {
    return rpcResult(async () => {
      verifyEnvelope(e);
      return this.credentials.logout(e.token);
    });
  }
  @MessagePattern(P.create) create(@Payload() e: Envelope) {
    return rpcResult(async () => {
      verifyEnvelope(e);
      return this.employees.create(
        await this.credentials.identity(e.token),
        validated(CreateEmployeeDto, e.data),
      );
    });
  }
  @MessagePattern(P.activationLink) activationLink(@Payload() e: Envelope) {
    return rpcResult(async () => {
      verifyEnvelope(e);
      return this.employees.activationLink(
        await this.credentials.identity(e.token),
        validated(IdDto, e.data).id,
      );
    });
  }
  @MessagePattern(P.employees) list(@Payload() e: Envelope) {
    return rpcResult(async () => {
      verifyEnvelope(e);
      return this.employees.list(
        await this.credentials.identity(e.token),
        validated(ListDto, e.data),
      );
    });
  }
  @MessagePattern(P.detail) detail(@Payload() e: Envelope) {
    return rpcResult(async () => {
      verifyEnvelope(e);
      return this.employees.detail(
        await this.credentials.identity(e.token),
        validated(IdDto, e.data).id,
      );
    });
  }
  @MessagePattern(P.update) update(@Payload() e: Envelope) {
    return rpcResult(async () => {
      verifyEnvelope(e);
      const d = e.data as { id: string; dto: unknown };
      return this.employees.update(
        await this.credentials.identity(e.token),
        validated(IdDto, { id: d.id }).id,
        validated(UpdateEmployeeDto, d.dto),
      );
    });
  }
  @MessagePattern(P.deactivate) deactivate(@Payload() e: Envelope) {
    return rpcResult(async () => {
      verifyEnvelope(e);
      return this.employees.deactivate(
        await this.credentials.identity(e.token),
        validated(IdDto, e.data).id,
      );
    });
  }
  @MessagePattern(P.departments) departments(@Payload() e: Envelope) {
    return rpcResult(async () => {
      verifyEnvelope(e);
      return this.employees.departments(
        await this.credentials.identity(e.token),
      );
    });
  }
  @MessagePattern(P.health) health(@Payload() e: Envelope) {
    return rpcResult(async () => {
      verifyEnvelope(e);
      await this.db.client.$queryRaw`SELECT 1`;
      return { status: 'ok', service: 'employee' };
    });
  }
}
