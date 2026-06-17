import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { WorkMode } from '@ellixr/database';
import { EmptyToUndefined } from '../../common/transforms';

export class CreateInternshipDto {
  @IsString() @MinLength(2) companyName!: string;
  @IsString() @MinLength(2) role!: string;
  @IsOptional() @IsEnum(WorkMode) workMode?: WorkMode;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsBoolean() isPaid?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) stipend?: number;
  @EmptyToUndefined() @IsOptional() @IsDateString() startDate?: string;
  @EmptyToUndefined() @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() isPpo?: boolean;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() certificateUrl?: string;
}

export class UpdateInternshipDto {
  @IsOptional() @IsString() @MinLength(2) companyName?: string;
  @IsOptional() @IsString() @MinLength(2) role?: string;
  @IsOptional() @IsEnum(WorkMode) workMode?: WorkMode;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsBoolean() isPaid?: boolean;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) stipend?: number;
  @EmptyToUndefined() @IsOptional() @IsDateString() startDate?: string;
  @EmptyToUndefined() @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() isPpo?: boolean;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() certificateUrl?: string;
}

export class VerifyInternshipDto {
  @IsIn(['verify', 'reject']) action!: 'verify' | 'reject';
  @IsOptional() @IsString() reason?: string;
}
