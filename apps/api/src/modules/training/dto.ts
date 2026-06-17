import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { CompletionStatus, TrainingCategory } from '@ellixr/database';
import { EmptyToUndefined } from '../../common/transforms';

export class CreateProgramDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsEnum(TrainingCategory) category?: TrainingCategory;
  @IsOptional() @IsString() description?: string;
  @EmptyToUndefined() @IsOptional() @IsDateString() startDate?: string;
  @EmptyToUndefined() @IsOptional() @IsDateString() endDate?: string;
}

export class UpdateProgramDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsEnum(TrainingCategory) category?: TrainingCategory;
  @IsOptional() @IsString() description?: string;
  @EmptyToUndefined() @IsOptional() @IsDateString() startDate?: string;
  @EmptyToUndefined() @IsOptional() @IsDateString() endDate?: string;
}

export class UpsertRecordDto {
  @IsString() @MinLength(1) studentId!: string;
  @IsString() @MinLength(1) programId!: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) attendancePercent?: number;
  @IsOptional() @IsEnum(CompletionStatus) completionStatus?: CompletionStatus;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) score?: number;
}

export class UpdateScoresDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) aptitudeScore?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) communicationScore?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100) interviewScore?: number;
}
