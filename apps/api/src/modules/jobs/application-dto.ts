import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { ApplicationStage, InterviewResult } from '@ellixr/database';

export class ChangeStageDto {
  @IsEnum(ApplicationStage) stage!: ApplicationStage;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() rejectionReason?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) offerCtc?: number;
}

export class CreateInterviewDto {
  @IsString() @MinLength(1) roundName!: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsString() mode?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsEnum(InterviewResult) result?: InterviewResult;
  @IsOptional() @IsString() feedback?: string;
}

export class UpdateInterviewDto {
  @IsOptional() @IsString() @MinLength(1) roundName?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsString() mode?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsEnum(InterviewResult) result?: InterviewResult;
  @IsOptional() @IsString() feedback?: string;
}
