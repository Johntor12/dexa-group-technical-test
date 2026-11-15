import { Controller, Get } from '@nestjs/common';
import { RpcClients } from '../../../libs/common/src/rpc.js';
@Controller('health')
export class HealthController {
  constructor(private readonly rpc: RpcClients) {}
  @Get() live() {
    return { status: 'ok', service: 'gateway' };
  }
  @Get('ready') async ready() {
    const services = await Promise.all([
      this.rpc.call('employee', 'health', {}),
      this.rpc.call('attendance', 'health', {}),
    ]);
    return { status: 'ok', services };
  }
}
