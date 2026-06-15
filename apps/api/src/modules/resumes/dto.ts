import { IsBoolean, IsIn, IsObject, IsOptional } from 'class-validator';
import { RESUME_TEMPLATES } from '@ellixr/shared';

export class UpdateResumeDto {
  @IsOptional()
  @IsIn(RESUME_TEMPLATES)
  template?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  // Validated against resumeDataSchema (zod) in the service; class-validator only
  // checks it's an object so whitelist doesn't strip the nested content.
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}
