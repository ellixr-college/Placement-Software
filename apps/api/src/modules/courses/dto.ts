import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCourseDto {
  @IsString() @MinLength(1) name!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) branches?: string[];
}

export class UpdateCourseDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) branches?: string[];
}
