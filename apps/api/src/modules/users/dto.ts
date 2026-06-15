import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { UserRole, PHONE_REGEX } from '@ellixr/shared';
import { EmptyToUndefined } from '../../common/transforms';

const PHONE_MESSAGE = 'Enter a valid 10-digit mobile number';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsIn([UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER])
  role!: typeof UserRole.COLLEGE_ADMIN | typeof UserRole.PLACEMENT_OFFICER;

  @EmptyToUndefined()
  @IsOptional()
  @Matches(PHONE_REGEX, { message: PHONE_MESSAGE })
  phone?: string;

  // Optional: set the teammate's password directly. If omitted, a random temp
  // password is generated and returned once.
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password?: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() fullName?: string;
  @EmptyToUndefined() @IsOptional() @Matches(PHONE_REGEX, { message: PHONE_MESSAGE }) phone?: string;
  @IsOptional() @IsIn([UserRole.COLLEGE_ADMIN, UserRole.PLACEMENT_OFFICER]) role?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
