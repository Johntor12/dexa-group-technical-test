import { RpcException } from '@nestjs/microservices';
export class DomainError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function fail(status: number, code: string, message: string): never {
  throw new DomainError(status, code, message);
}
export async function rpcResult<T>(fn: () => Promise<T>) {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof DomainError)
      throw new RpcException({
        statusCode: error.statusCode,
        code: error.code,
        message: error.message,
      });
    if ((error as { code?: string }).code === 'P2002')
      throw new RpcException({
        statusCode: 409,
        code: 'CONFLICT',
        message: 'Data already exists.',
      });
    if ((error as { code?: string }).code === 'P2025')
      throw new RpcException({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Record not found.',
      });
    throw new RpcException({
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'Service temporarily unavailable.',
    });
  }
}
