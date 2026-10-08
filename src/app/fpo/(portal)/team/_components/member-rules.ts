import { z } from "zod";

type T = Record<string, string>;

// Team member name / phone rules. Mirrored by the backend (KAU_FPO_BE
// apps/fpo/api/team.py) and stated in the bulk-invite .xlsx template.
export const NAME_MAX_LENGTH = 20;

// English or Malayalam letters only — no spaces, digits or symbols
// (U+0D00–U+0D63 letters and vowel signs, U+0D7A–U+0D7F chillus, ZWNJ/ZWJ used in Malayalam spelling)
const LETTERS_ONLY = /^[A-Za-zഀ-ൣൺ-ൿ‌‍]+$/;

// Messages come from the fpo_team translations; build the schema with the
// current `t` so they follow the selected language.
export function memberName(t: T, field: "first_name" | "last_name") {
  const label = field === "first_name" ? "First name" : "Last name";
  return z
    .string()
    .trim()
    .min(1, t[`validation_${field}_required`] ?? `${label} is required`)
    .max(
      NAME_MAX_LENGTH,
      (t[`validation_${field}_max`] ?? `${label} can have at most {max} characters`).replace(
        "{max}",
        String(NAME_MAX_LENGTH),
      ),
    )
    .regex(LETTERS_ONLY, t[`validation_${field}_letters`] ?? `${label} can contain letters only`);
}

export function memberEmail(t: T) {
  return z
    .string()
    .min(1, t.validation_email_required ?? "Email is required")
    .email(t.validation_email_invalid ?? "Enter a valid email address");
}

// Optional — blank is allowed
export function memberPhone(t: T) {
  return z.string().refine((v) => v === "" || /^\d{10}$/.test(v), {
    message: t.validation_phone_digits ?? "Phone number must be exactly 10 digits",
  });
}
