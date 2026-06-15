/**
 * Shared field validation + normalization used by both the API (class-validator
 * DTOs) and the web forms, so the rules can't drift between client and server.
 */

// A pragmatic email shape check (the API also runs class-validator's @IsEmail).
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

// Indian mobile number: 10 digits starting 6–9, with an optional +91 country
// code. Spaces and dashes are tolerated and stripped before checking.
export const PHONE_REGEX = /^(?:\+?91)?[6-9]\d{9}$/;

export function normalizePhoneDigits(value: string): string {
  return value.replace(/[\s\-()]/g, '');
}

export function isValidPhone(value: string): boolean {
  return PHONE_REGEX.test(normalizePhoneDigits(value));
}

/**
 * Title-cases a free-text value (city, state, …): "bengaluru" → "Bengaluru",
 * "tamil nadu" → "Tamil Nadu". Intentionally NOT used for names/acronyms (it
 * would turn "IIT" into "Iit").
 */
export function toTitleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}
