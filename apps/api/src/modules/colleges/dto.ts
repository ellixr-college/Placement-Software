import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { PHONE_REGEX } from '@ellixr/shared';
import { EmptyToUndefined, TitleCase } from '../../common/transforms';

const PHONE_MESSAGE = 'Enter a valid 10-digit mobile number';

export class CreateCollegeDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase letters, numbers, and hyphens' })
  slug!: string;

  @IsEmail()
  contactEmail!: string;

  @EmptyToUndefined()
  @IsOptional()
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  contactPhone?: string;

  @TitleCase()
  @IsOptional()
  @IsString()
  city?: string;

  @TitleCase()
  @IsOptional()
  @IsString()
  state?: string;

  // Initial College Admin
  @IsString()
  @MinLength(2)
  adminFullName!: string;

  @IsEmail()
  adminEmail!: string;

  // Optional: set the super-admin's password directly. If omitted, a random
  // temp password is generated and returned once.
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  adminPassword?: string;
}

export class UpdateCollegeDto {
  @IsOptional() @IsString() name?: string;
  @EmptyToUndefined() @IsOptional() @Matches(PHONE_REGEX, { message: PHONE_MESSAGE }) contactPhone?: string;
  @TitleCase() @IsOptional() @IsString() city?: string;
  @TitleCase() @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() subscriptionPlan?: string;
  @IsOptional() @IsString() subscriptionStatus?: string;
}
