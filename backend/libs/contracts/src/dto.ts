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
  IsEnum,
  IsBoolean,
  IsIn,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';
import { DepartmentCode } from './department.js';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { AttendanceEvidenceKind, WorkProofType } from './attendance-evidence.js';
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
  @ApiProperty() @IsString() @Length(1, 150) fullName!: string;
  @ApiProperty({ enum: DepartmentCode }) @IsEnum(DepartmentCode) department!: DepartmentCode;
  @ApiProperty() @IsString() @Length(1, 100) position!: string;
}
export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto, {
  skipNullProperties: false,
}) {}
export class DeactivateEmployeeDto {
  @ApiProperty({ minLength: 10, maxLength: 500 })
  @IsString()
  @Length(10, 500)
  @Matches(/\S/)
  reason!: string;
}
export class DeactivateEmployeeRequestDto extends DeactivateEmployeeDto {
  @ApiProperty()
  @IsUUID()
  id!: string;
}
export class ActivateAccountDto {
  @ApiProperty() @Matches(/^[a-f0-9]{64}$/) token!: string;
  @ApiProperty() @IsString() @Length(12, 72) @IsByteLength(12, 72) password!: string;
}
export class ForgotPasswordDto {
  @ApiProperty() @IsEmail() @Length(3, 191) email!: string;
}
export class ResetPasswordDto {
  @ApiProperty() @Matches(/^[a-f0-9]{64}$/) token!: string;
  @ApiProperty() @IsString() @Length(12, 72) @IsByteLength(12, 72) password!: string;
}
export class ChangePasswordDto {
  @ApiProperty() @IsString() @Length(1, 72) @IsByteLength(1, 72) currentPassword!: string;
  @ApiProperty() @IsString() @Length(12, 72) @IsByteLength(12, 72) newPassword!: string;
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
  @ApiPropertyOptional({ enum: ['DIRECT', 'MISSED_CHECK_IN_CLAIM'] })
  @IsOptional()
  @IsIn(['DIRECT', 'MISSED_CHECK_IN_CLAIM'])
  source?: 'DIRECT' | 'MISSED_CHECK_IN_CLAIM';
}
export class IdDto {
  @IsUUID() id!: string;
}
export class MissedCheckInClaimDecisionDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 1000) note?: string;
}
export class MissedCheckInClaimRejectDto {
  @ApiProperty() @IsString() @Length(20, 1000) reason!: string;
}
export class MissedCheckInClaimQueueDto extends ListDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @IsOptional() @IsEnum(['PENDING', 'APPROVED', 'REJECTED'])
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}
export class StagedAttendanceEvidenceDto {
  @ApiProperty({ enum: Object.values(AttendanceEvidenceKind) })
  @IsEnum(AttendanceEvidenceKind)
  kind!: AttendanceEvidenceKind;
  @ApiProperty() @IsUUID() storageKey!: string;
  @ApiProperty() @Matches(/^image\/(jpeg|png|webp)$/) mimeType!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(5242880) size!: number;
  @ApiProperty() @Matches(/^[a-f0-9]{64}$/) fingerprint!: string;
}

export class AttendanceCaptureMetadataDto {
  @ApiProperty({ enum: Object.values(WorkProofType) })
  @IsEnum(WorkProofType)
  workProofType!: WorkProofType;
}

export class SubmitDto extends AttendanceCaptureMetadataDto {
  @ApiProperty() @IsString() @Length(1, 100) key!: string;
  @ApiProperty() @Matches(/^[a-f0-9]{64}$/) fingerprint!: string;
  @ApiProperty({ type: [StagedAttendanceEvidenceDto] })
  @IsArray() @ArrayMinSize(2) @ArrayMaxSize(2)
  @ValidateNested({ each: true }) @Type(() => StagedAttendanceEvidenceDto)
  evidence!: StagedAttendanceEvidenceDto[];
}

export class CheckOutMetadataDto extends AttendanceCaptureMetadataDto {
  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  activityDescription?: string;
}

export class CheckOutDto extends SubmitDto {
  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  activityDescription?: string;
}
export class AttendanceEvidenceRequestDto {
  @ApiProperty() @IsUUID() id!: string;
  @ApiProperty({ enum: Object.values(AttendanceEvidenceKind) })
  @IsEnum(AttendanceEvidenceKind)
  kind!: AttendanceEvidenceKind;
}
export class MissedCheckInClaimFieldsDto {
  @ApiProperty() @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) workDate!: string;
  @ApiProperty() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) claimedCheckInTime!: string;
  @ApiProperty() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) claimedCheckOutTime!: string;
  @ApiProperty() @IsString() @Length(20, 1000) reason!: string;
  @ApiProperty()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean() truthConfirmed!: boolean;
}

export class StagedClaimEvidenceDto {
  @ApiProperty({ enum: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] })
  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
  mimeType!: string;
  @ApiProperty() @IsUUID() storageKey!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(5242880) size!: number;
  @ApiProperty() @Matches(/^[a-f0-9]{64}$/) fingerprint!: string;
}

export class MissedCheckInClaimDto extends MissedCheckInClaimFieldsDto {
  @ApiProperty() @Matches(/^[A-Za-z0-9_-]{1,100}$/) key!: string;
  @ApiProperty({ type: StagedClaimEvidenceDto })
  @ValidateNested() @Type(() => StagedClaimEvidenceDto)
  evidence!: StagedClaimEvidenceDto;
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
