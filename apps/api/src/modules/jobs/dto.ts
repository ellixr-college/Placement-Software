import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { JobType, WorkMode } from '@ellixr/database';

// A single custom application question attached to a job.
export class ApplicationFieldDto {
  @IsString() @MinLength(1) id!: string;
  @IsString() @MinLength(1) label!: string;
  @IsIn(['text', 'textarea', 'select', 'number']) type!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) options?: string[];
  @IsOptional() @IsBoolean() required?: boolean;
}

// Student-submitted answers when applying to a job that has a custom form.
export class ApplyDto {
  @IsOptional() @IsObject() formResponses?: Record<string, string>;
}

export class CreateJobDto {
  @IsString() @MinLength(2) title!: string;
  // Company is now optional & independent of job posting — either link an existing
  // company (companyId) or just type a name (companyName), or neither.
  @IsOptional() @IsString() companyId?: string;
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(JobType) jobType?: JobType;
  @IsOptional() @IsEnum(WorkMode) workMode?: WorkMode;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) experienceMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) experienceMax?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) ctcMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) ctcMax?: number;

  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) eligibleCourses!: string[];
  @IsArray() @IsString({ each: true }) eligibleBranches!: string[];

  @IsArray() @ArrayNotEmpty() @Type(() => Number) @IsInt({ each: true })
  graduationYears!: number[];

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minCgpa?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) minTenthPercentage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) minTwelfthPercentage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) minUgPercentage?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) eligibleGenders?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxActiveBacklogs?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxTotalBacklogs?: number;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ApplicationFieldDto)
  applicationFormFields?: ApplicationFieldDto[];

  @IsOptional() @IsString() pdfUrl?: string;
  @IsOptional() @IsString() pdfName?: string;

  @IsOptional() @IsDateString() applicationDeadline?: string;
}

export class UpdateJobDto {
  @IsOptional() @IsString() @MinLength(2) title?: string;
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(JobType) jobType?: JobType;
  @IsOptional() @IsEnum(WorkMode) workMode?: WorkMode;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) experienceMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) experienceMax?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) ctcMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) ctcMax?: number;

  @IsOptional() @IsArray() @IsString({ each: true }) eligibleCourses?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) eligibleBranches?: string[];

  @IsOptional() @IsArray() @Type(() => Number) @IsInt({ each: true }) graduationYears?: number[];

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minCgpa?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) minTenthPercentage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) minTwelfthPercentage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) minUgPercentage?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) eligibleGenders?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxActiveBacklogs?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxTotalBacklogs?: number;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ApplicationFieldDto)
  applicationFormFields?: ApplicationFieldDto[];

  @IsOptional() @IsString() pdfUrl?: string;
  @IsOptional() @IsString() pdfName?: string;

  @IsOptional() @IsDateString() applicationDeadline?: string;
}

// Platform Admin broadcast job: free-text company (no tenant Company row) and an
// explicit list of target colleges instead of an implicit single collegeId.
export class CreatePlatformJobDto {
  @IsString() @MinLength(2) title!: string;
  @IsString() @MinLength(1) companyName!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(JobType) jobType?: JobType;
  @IsOptional() @IsEnum(WorkMode) workMode?: WorkMode;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) experienceMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) experienceMax?: number;

  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) targetCollegeIds!: string[];

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) ctcMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) ctcMax?: number;

  @IsArray() @ArrayNotEmpty() @IsString({ each: true }) eligibleCourses!: string[];
  @IsArray() @IsString({ each: true }) eligibleBranches!: string[];

  @IsArray() @ArrayNotEmpty() @Type(() => Number) @IsInt({ each: true })
  graduationYears!: number[];

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minCgpa?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) minTenthPercentage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) minTwelfthPercentage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) minUgPercentage?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) eligibleGenders?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxActiveBacklogs?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxTotalBacklogs?: number;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ApplicationFieldDto)
  applicationFormFields?: ApplicationFieldDto[];

  @IsOptional() @IsString() pdfUrl?: string;
  @IsOptional() @IsString() pdfName?: string;

  @IsOptional() @IsDateString() applicationDeadline?: string;
}

export class UpdatePlatformJobDto {
  @IsOptional() @IsString() @MinLength(2) title?: string;
  @IsOptional() @IsString() @MinLength(1) companyName?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(JobType) jobType?: JobType;
  @IsOptional() @IsEnum(WorkMode) workMode?: WorkMode;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) experienceMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) experienceMax?: number;

  @IsOptional() @IsArray() @ArrayNotEmpty() @IsString({ each: true }) targetCollegeIds?: string[];

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) ctcMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) ctcMax?: number;

  @IsOptional() @IsArray() @IsString({ each: true }) eligibleCourses?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) eligibleBranches?: string[];

  @IsOptional() @IsArray() @Type(() => Number) @IsInt({ each: true }) graduationYears?: number[];

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minCgpa?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) minTenthPercentage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) minTwelfthPercentage?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) minUgPercentage?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) eligibleGenders?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxActiveBacklogs?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxTotalBacklogs?: number;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ApplicationFieldDto)
  applicationFormFields?: ApplicationFieldDto[];

  @IsOptional() @IsString() pdfUrl?: string;
  @IsOptional() @IsString() pdfName?: string;

  @IsOptional() @IsDateString() applicationDeadline?: string;
}

export class ListJobsQuery {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
