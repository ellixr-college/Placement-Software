import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { PHONE_REGEX } from '@ellixr/shared';
import { EmptyToUndefined, TitleCase } from '../../common/transforms';

const PHONE_MESSAGE = 'Enter a valid 10-digit mobile number';

// Query booleans arrive as strings ("true"/"false"); coerce before validating.
const toBool = ({ value }: { value: unknown }) =>
  value === 'true' || value === true ? true : value === 'false' || value === false ? false : value;

export class CreateAlumniDto {
  @IsString() @MinLength(2) fullName!: string;
  @IsEmail() email!: string;
  @EmptyToUndefined() @IsOptional() @Matches(PHONE_REGEX, { message: PHONE_MESSAGE }) phone?: string;
  @Type(() => Number) @IsInt() @Min(1950) @Max(2100) graduationYear!: number;
  @IsString() @MinLength(1) branch!: string;
  @IsOptional() @IsString() course?: string;
  @IsOptional() @IsString() currentCompany?: string;
  @IsOptional() @IsString() currentDesignation?: string;
  @TitleCase() @IsOptional() @IsString() currentLocation?: string;
  @IsOptional() @IsString() linkedinUrl?: string;
  @IsOptional() @IsBoolean() isMentor?: boolean;
  @IsOptional() @IsBoolean() isHiring?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() notes?: string;
}

export class UpdateAlumniDto {
  @IsOptional() @IsString() @MinLength(2) fullName?: string;
  @IsOptional() @IsEmail() email?: string;
  @EmptyToUndefined() @IsOptional() @Matches(PHONE_REGEX, { message: PHONE_MESSAGE }) phone?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1950) @Max(2100) graduationYear?: number;
  @IsOptional() @IsString() @MinLength(1) branch?: string;
  @IsOptional() @IsString() course?: string;
  @IsOptional() @IsString() currentCompany?: string;
  @IsOptional() @IsString() currentDesignation?: string;
  @TitleCase() @IsOptional() @IsString() currentLocation?: string;
  @IsOptional() @IsString() linkedinUrl?: string;
  @IsOptional() @IsBoolean() isMentor?: boolean;
  @IsOptional() @IsBoolean() isHiring?: boolean;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ListAlumniQuery {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() branch?: string;
  @IsOptional() @Type(() => Number) @IsInt() graduationYear?: number;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @Transform(toBool) @IsBoolean() isMentor?: boolean;
  @IsOptional() @Transform(toBool) @IsBoolean() isHiring?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
