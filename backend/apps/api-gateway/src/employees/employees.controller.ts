import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Header,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  ListDto,
} from '../../../../libs/contracts/src/dto.js';
import { RpcClients } from '../../../../libs/common/src/rpc.js';
import { AuthGuard, Roles } from '../common/security.js';
import type { ApiRequest } from '../common/security.js';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Roles('HRD')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly rpc: RpcClients) {}
  @Post() @Header('Cache-Control', 'no-store') create(
    @Body() dto: CreateEmployeeDto,
    @Req() r: ApiRequest,
  ) {
    return this.rpc.call(
      'employee',
      'employees.create',
      dto,
      r.token,
      r.requestId,
    );
  }
  @Get() list(@Query() q: ListDto, @Req() r: ApiRequest) {
    return this.rpc.call('employee', 'employees.list', q, r.token, r.requestId);
  }
  @Get('departments') departments(@Req() r: ApiRequest) {
    return this.rpc.call(
      'employee',
      'employees.departments',
      {},
      r.token,
      r.requestId,
    );
  }
  @Post(':id/activation-link')
  @Header('Cache-Control', 'no-store')
  activationLink(@Param('id', ParseUUIDPipe) id: string, @Req() r: ApiRequest) {
    return this.rpc.call(
      'employee',
      'employees.activation-link',
      { id },
      r.token,
      r.requestId,
    );
  }
  @Get(':id') detail(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() r: ApiRequest,
  ) {
    return this.rpc.call(
      'employee',
      'employees.detail',
      { id },
      r.token,
      r.requestId,
    );
  }
  @Patch(':id') update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
    @Req() r: ApiRequest,
  ) {
    return this.rpc.call(
      'employee',
      'employees.update',
      { id, dto },
      r.token,
      r.requestId,
    );
  }
  @Delete(':id') deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() r: ApiRequest,
  ) {
    return this.rpc.call(
      'employee',
      'employees.deactivate',
      { id },
      r.token,
      r.requestId,
    );
  }
}
