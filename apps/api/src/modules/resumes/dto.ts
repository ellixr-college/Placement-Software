import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateResumeDto {
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
