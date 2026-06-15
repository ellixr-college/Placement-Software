import { Transform } from 'class-transformer';
import { toTitleCase } from '@ellixr/shared';

/**
 * Coerce a blank string to `undefined` so `@IsOptional()` treats an empty
 * optional field as absent (otherwise a submitted "" would fail format checks
 * like `@Matches`). Apply BEFORE `@IsOptional()`.
 */
export const EmptyToUndefined = () =>
  Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  );

/** Title-case a free-text location field (city, state): "bengaluru" → "Bengaluru". */
export const TitleCase = () =>
  Transform(({ value }) =>
    typeof value === 'string' && value.trim() ? toTitleCase(value) : value,
  );
