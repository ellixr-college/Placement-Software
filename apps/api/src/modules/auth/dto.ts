import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
