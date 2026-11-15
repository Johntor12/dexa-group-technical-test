import 'dotenv/config';
export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}
export function secret(name: string): string {
  const value = required(name);
  if (value.length < 32)
    throw new Error(`${name} must contain at least 32 characters`);
  return value;
}
export const config = {
  employeeHost: process.env.EMPLOYEE_SERVICE_HOST ?? '127.0.0.1',
  employeePort: Number(process.env.EMPLOYEE_SERVICE_PORT ?? 4001),
  attendanceHost: process.env.ATTENDANCE_SERVICE_HOST ?? '127.0.0.1',
  attendancePort: Number(process.env.ATTENDANCE_SERVICE_PORT ?? 4002),
};
