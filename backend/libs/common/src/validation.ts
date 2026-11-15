import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { fail } from './errors.js';
export function validated<T extends object>(
  type: new () => T,
  data: unknown,
): T {
  if (!data || typeof data !== 'object' || Array.isArray(data))
    fail(400, 'VALIDATION_ERROR', 'Invalid request payload.');
  const dto = plainToInstance(type, data);
  const errors = validateSync(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  if (errors.length)
    fail(
      400,
      'VALIDATION_ERROR',
      errors
        .map((e) => Object.values(e.constraints ?? {}).join(', '))
        .join('; '),
    );
  return dto;
}
