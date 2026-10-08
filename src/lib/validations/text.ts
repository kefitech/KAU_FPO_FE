/**
 * Free-text Validation Helpers
 */

// Free text must contain a letter or digit, so input made only of symbols ("@#$%") is rejected.
// Unicode-aware, so Malayalam text passes. Mirrors validate_not_only_symbols in the
// backend's apps/core/utils/validators.py.
export const hasLetterOrDigit = (value: string) => /[\p{L}\p{N}]/u.test(value);

// Person names: English letters only, with single words separated by spaces (no digits or symbols).
export const NAME_PATTERN = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
