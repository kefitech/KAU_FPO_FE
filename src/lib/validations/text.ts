/**
 * Free-text Validation Helpers
 */

// Free text must contain a letter or digit, so input made only of symbols ("@#$%") is rejected.
// Unicode-aware, so Malayalam text passes. Mirrors validate_not_only_symbols in the
// backend's apps/core/utils/validators.py.
export const hasLetterOrDigit = (value: string) => /[\p{L}\p{N}]/u.test(value);
