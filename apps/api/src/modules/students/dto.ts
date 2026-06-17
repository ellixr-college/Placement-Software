import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { StudentStatus, VerificationStatus } from '@ellixr/database';
import { PHONE_REGEX } from '@ellixr/shared';
import { EmptyToUndefined } from '../../common/transforms';

const CURRENT_YEAR = new Date().getFullYear();
const PHONE_MESSAGE = 'Enter a valid 10-digit mobile number';
export const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

export class SemesterMarkDto {
  @IsString() @MinLength(1) label!: string;
  @IsString() score!: string;
}

export class CreateStudentDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  rollNumber!: string;

  @IsString()
  @MinLength(1)
  course!: string;

  @IsString()
  @MinLength(1)
  branch!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1990)
  @Max(CURRENT_YEAR + 10)
  graduationYear!: number;

  @IsOptional()
  @IsString()
  enrollmentNumber?: string;

  @EmptyToUndefined()
  @IsOptional()
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phone?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  cgpa?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  activeBacklogs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalBacklogs?: number;

  @EmptyToUndefined() @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsIn(GENDERS) gender?: string;
  @EmptyToUndefined() @IsOptional() @IsEmail() personalEmail?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) tenthPercentage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) twelfthPercentage?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SemesterMarkDto)
  semesterMarks?: SemesterMarkDto[];
}

export class UpdateStudentDto {
  @IsOptional() @IsString() @MinLength(2) fullName?: string;
  @EmptyToUndefined() @IsOptional() @Matches(PHONE_REGEX, { message: PHONE_MESSAGE }) phone?: string;
  @IsOptional() @IsString() @MinLength(1) course?: string;
  @IsOptional() @IsString() @MinLength(1) branch?: string;
  @IsOptional() @IsString() enrollmentNumber?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1990) @Max(CURRENT_YEAR + 10)
  graduationYear?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(10) cgpa?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) activeBacklogs?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) totalBacklogs?: number;
  @EmptyToUndefined() @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsIn(GENDERS) gender?: string;
  @EmptyToUndefined() @IsOptional() @IsEmail() personalEmail?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) tenthPercentage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) twelfthPercentage?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SemesterMarkDto) semesterMarks?: SemesterMarkDto[];
}

// Fields a student may edit on their own record. rollNumber is intentionally
// excluded — it is the officer-assigned identity.
export class UpdateOwnProfileDto {
  @IsOptional() @IsString() @MinLength(2) fullName?: string;
  @EmptyToUndefined() @IsOptional() @Matches(PHONE_REGEX, { message: PHONE_MESSAGE }) phone?: string;
  @IsOptional() @IsString() enrollmentNumber?: string;
  @IsOptional() @IsString() @MinLength(1) course?: string;
  @IsOptional() @IsString() @MinLength(1) branch?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1990) @Max(CURRENT_YEAR + 10)
  graduationYear?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(10) cgpa?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) activeBacklogs?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) totalBacklogs?: number;
  @EmptyToUndefined() @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsIn(GENDERS) gender?: string;
  @EmptyToUndefined() @IsOptional() @IsEmail() personalEmail?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) tenthPercentage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) twelfthPercentage?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SemesterMarkDto) semesterMarks?: SemesterMarkDto[];
}

export class VerifyStudentDto {
  @IsIn(['verify', 'reject'])
  action!: 'verify' | 'reject';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ImportStudentsDto {
  /** Raw CSV text. Header row required; see /students/import template. */
  @IsString()
  @MinLength(1)
  csv!: string;
}

export class SetStudentStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

export class ListStudentsQuery {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() branch?: string;

  @IsOptional() @Type(() => Number) @IsInt() graduationYear?: number;

  @IsOptional() @IsIn(Object.values(StudentStatus)) status?: StudentStatus;

  @IsOptional() @IsIn(Object.values(VerificationStatus))
  verificationStatus?: VerificationStatus;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}
