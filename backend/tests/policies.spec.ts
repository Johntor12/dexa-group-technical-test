
import { describe,it,expect } from 'vitest';
import { workDate } from '../libs/common/src/time.js';
import { imageType } from '../libs/common/src/storage.js';
import { validated } from '../libs/common/src/validation.js';
import { ListDto,CreateEmployeeDto } from '../libs/contracts/src/dto.js';
describe('attendance policies',()=>{
 it('uses Jakarta midnight independent of the browser clock',()=>{
  expect(workDate(new Date('2026-11-13T16:59:59Z'))).toBe('2026-11-13');
  expect(workDate(new Date('2026-11-13T17:00:00Z'))).toBe('2026-11-14');
 });
 it('rejects a fake image signature',()=>{expect(()=>imageType(Buffer.from('<script>hello</script>'))).toThrow();});
 it('caps pagination and rejects unexpected fields',()=>{
  expect(()=>validated(ListDto,{limit:101})).toThrow();
  expect(()=>validated(ListDto,{role:'HRD'})).toThrow();
  expect(validated(ListDto,{}).limit).toBe(20);
 });
 it('rejects role escalation in employee creation',()=>{
  const valid={email:'test@example.test',fullName:'Test',employeeNumber:'E1',department:'IT',position:'Developer'};
  expect(()=>validated(CreateEmployeeDto,{...valid,role:'HRD'})).toThrow();
  expect(()=>validated(CreateEmployeeDto,{...valid,department:'UNLISTED'})).toThrow();
  expect(validated(CreateEmployeeDto,valid).department).toBe('IT');
 });
});
