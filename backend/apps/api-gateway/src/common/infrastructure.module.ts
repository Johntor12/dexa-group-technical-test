import { Global, Module } from '@nestjs/common';
import { RpcClients } from '../../../../libs/common/src/rpc.js';
import { PhotoStorage } from '../../../../libs/common/src/storage.js';
import { AuthGuard } from './security.js';
@Global()
@Module({
  providers: [RpcClients, PhotoStorage, AuthGuard],
  exports: [RpcClients, PhotoStorage, AuthGuard],
})
export class InfrastructureModule {}
