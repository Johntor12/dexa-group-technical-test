import {
  IsEmail,
  IsString,
  Length,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  Max,
  Matches,
  IsDateString,
  IsByteLength,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { DepartmentCode } from './department.js';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
export class LoginDto {
  @ApiProperty() @IsEmail() @Length(3, 191) email!: string;
  @ApiProperty()
  @IsString()
  @Length(1, 72)
  @IsByteLength(1, 72)
  password!: string;
}
export class CreateEmployeeDto {
  @ApiProperty() @IsEmail() @Length(3, 191) email!: string;
  @ApiProperty()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,50}$/)
  employeeNumber!: string;
  @ApiProperty() @IsString() @Length(1, 150) fullName!: string;
  @ApiProperty({ enum: DepartmentCode }) @IsEnum(DepartmentCode) department!: DepartmentCode;
  @ApiProperty() @IsString() @Length(1, 100) position!: string;
}
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto, {
  skipNullProperties: false,
}) {}
export class ActivateAccountDto {
  @ApiProperty() @Matches(/^[a-f0-9]{64}$/) token!: string;
  @ApiProperty() @IsString() @Length(12, 72) @IsByteLength(12, 72) password!: string;
}
export class ListDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 100)
  search?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  date?: string;
  @ApiPropertyOptional({ enum: DepartmentCode }) @IsOptional() @IsEnum(DepartmentCode) department?: DepartmentCode;
  @ApiPropertyOptional() @IsOptional() @IsUUID() employeeId?: string;
  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'PENDING_ACTIVATION'] })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'PENDING_ACTIVATION'])
  employeeStatus?: 'ACTIVE' | 'INACTIVE' | 'PENDING_ACTIVATION';
}
export class IdDto {
  @IsUUID() id!: string;
}
export class CorrectionCreateDto {
  @ApiProperty() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) workDate!: string;
  @ApiProperty() @IsString() @Length(20, 1000) reason!: string;
  @ApiProperty() @IsUUID() storageKey!: string;
  @ApiProperty() @Matches(/^image\/(jpeg|png|webp)$/) mimeType!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(5242880) size!: number;
  @ApiProperty() @Matches(/^[a-f0-9]{64}$/) fingerprint!: string;
  @ApiProperty() @Matches(/^[A-Za-z0-9_-]{1,100}$/) key!: string;
}
export class CorrectionDecisionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 1000) note?: string;
}
export class CorrectionRejectDto {
  @ApiProperty() @IsString() @Length(20, 1000) reason!: string;
}
export class CorrectionInboxDto extends ListDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @IsOptional() @IsEnum(['PENDING', 'APPROVED', 'REJECTED'])
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}
export class SubmitDto {
  @ApiProperty() @IsUUID() storageKey!: string;
  @ApiProperty() @IsString() @Length(1, 100) key!: string;
  @ApiProperty() @Matches(/^[a-f0-9]{64}$/) fingerprint!: string;
  @ApiProperty() @Matches(/^image\/(jpeg|png|webp)$/) mimeType!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(5242880) size!: number;
  @ApiProperty() @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @ApiProperty() @IsNumber() @Min(-180) @Max(180) longitude!: number;
  @ApiProperty() @IsNumber() @Min(0) locationAccuracy!: number;
  @ApiProperty() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/) checkInPhotoCapturedAt!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^[+-]\d{2}:\d{2}$/) checkInPhotoOffset?: string;
  @ApiProperty() @IsString() @Length(1, 500) taskDescription!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 500) wfhReason?: string;
}
export class AttendanceMetadataDto {
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(-90) @Max(90) latitude!: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(-180) @Max(180) longitude!: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) locationAccuracy!: number;
  @ApiProperty() @IsString() @Length(1, 500) taskDescription!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/) checkInPhotoCapturedAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 500) wfhReason?: string;
}
export class MissedCheckInClaimDto {
  @ApiProperty() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) workDate!: string;
  @ApiProperty() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) claimedCheckInTime!: string;
  @ApiProperty() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) claimedCheckOutTime!: string;
  @ApiProperty() @IsString() @Length(1, 500) taskDescription!: string;
  @ApiProperty() @IsString() @Length(20, 1000) reason!: string;
  @ApiProperty() @IsBoolean() truthConfirmed!: boolean;
  @ApiProperty() @Matches(/^[A-Za-z0-9_-]{1,100}$/) key!: string;
}
export function pageResult(data: unknown[], total: number, q: ListDto) {
  return {
    data,
    meta: {
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.ceil(total / q.limit),
    },
  };
}
