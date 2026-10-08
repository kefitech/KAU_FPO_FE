/**
 * Training Session Edit Validation
 * Same rules as the create pages (government/cbbo training/new), minus the FPO and time
 * fields, which the edit form doesn't have.
 */

export type SessionFieldKey = "topic" | "trainer" | "date" | "duration" | "participants" | "venue";
export type SessionFieldErrors = Partial<Record<SessionFieldKey, string>>;

export type SessionFormValues = {
  topic: string;
  trainerName: string;
  date: string;
  durationHours: string;
  participantsCount: string;
  venue: string;
};

// Mirrors MAX_TRAINING_PARTICIPANTS in the backend's apps/core/utils/constants.py
export const MAX_TRAINING_PARTICIPANTS = 10000;

// Letters in English or Malayalam
const HAS_LETTER = /[A-Za-zഀ-ൿ]/;
// Names: letters, spaces, dots, apostrophes, hyphens only
const TRAINER_NAME_PATTERN = /^[A-Za-zഀ-ൿ\s.'-]+$/;

// Today's date as YYYY-MM-DD in local time (IST)
export const todayLocalISO = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

// Block e, E, +, - (and "." for whole numbers) in number inputs
export const blockNonNumeric = (allowDecimal: boolean) => (e: React.KeyboardEvent<HTMLInputElement>) => {
  const blocked = ["e", "E", "+", "-"];
  if (!allowDecimal) blocked.push(".");
  if (blocked.includes(e.key)) e.preventDefault();
};

/**
 * Validate the edit form. `originalDate` is the session's saved date: a session that has
 * already happened can still be edited without its date tripping the "in the past" rule,
 * but it can't be moved to a different past date.
 */
export const validateTrainingSession = (
  v: SessionFormValues,
  t: Record<string, string>,
  originalDate?: string,
): SessionFieldErrors => {
  const e: SessionFieldErrors = {};

  // Topic: required, 3 – 200 characters, must contain letters
  const tp = v.topic.trim();
  if (tp === "") {
    e.topic = t.err_topic_required ?? "Topic is required";
  } else if (tp.length < 3) {
    e.topic = t.err_topic_min ?? "Topic must be at least 3 characters";
  } else if (tp.length > 200) {
    e.topic = t.err_topic_max ?? "Topic must be under 200 characters";
  } else if (!HAS_LETTER.test(tp)) {
    e.topic = t.err_topic_invalid ?? "Enter a valid topic";
  }

  // Trainer name: required, 2 – 100 characters, letters only
  const tr = v.trainerName.trim();
  if (tr === "") {
    e.trainer = t.err_trainer_required ?? "Trainer name is required";
  } else if (tr.length < 2) {
    e.trainer = t.err_trainer_min ?? "Trainer name must be at least 2 characters";
  } else if (tr.length > 100) {
    e.trainer = t.err_trainer_max ?? "Trainer name must be under 100 characters";
  } else if (!TRAINER_NAME_PATTERN.test(tr) || !HAS_LETTER.test(tr)) {
    e.trainer = t.err_trainer_invalid ?? "Trainer name can contain only letters and spaces";
  }

  // Date: required, valid, today or later unless it's the date already saved
  if (!v.date) {
    e.date = t.err_date_required ?? "Date is required";
  } else if (Number.isNaN(Date.parse(v.date))) {
    e.date = t.err_date_invalid ?? "Enter a valid date";
  } else if (v.date < todayLocalISO() && v.date !== originalDate) {
    e.date = t.err_date_past ?? "Date cannot be in the past";
  }

  // Duration: required, > 0, <= 24, steps of 0.5
  const duration = Number(v.durationHours);
  if (v.durationHours.trim() === "") {
    e.duration = t.err_duration_required ?? "Duration is required";
  } else if (Number.isNaN(duration)) {
    e.duration = t.err_duration_invalid ?? "Enter a valid number";
  } else if (duration <= 0) {
    e.duration = t.err_duration_min ?? "Duration must be greater than 0";
  } else if (duration > 24) {
    e.duration = t.err_duration_max ?? "Duration cannot exceed 24 hours";
  } else if (!Number.isInteger(duration * 2)) {
    e.duration = t.err_duration_step ?? "Use increments of 0.5 hours";
  }

  // Participants: required, whole number, 1 – 10,000
  const participants = Number(v.participantsCount);
  if (v.participantsCount.trim() === "") {
    e.participants = t.err_participants_required ?? "Participants is required";
  } else if (Number.isNaN(participants) || !Number.isInteger(participants)) {
    e.participants = t.err_participants_int ?? "Participants must be a whole number";
  } else if (participants < 1) {
    e.participants = t.err_participants_min ?? "At least 1 participant is required";
  } else if (participants > MAX_TRAINING_PARTICIPANTS) {
    e.participants = t.err_participants_max ?? "Participants cannot exceed 10,000";
  }

  // Venue: required, 3 – 200 characters, must contain letters
  const vn = v.venue.trim();
  if (vn === "") {
    e.venue = t.err_venue_required ?? "Venue is required";
  } else if (vn.length < 3) {
    e.venue = t.err_venue_min ?? "Venue must be at least 3 characters";
  } else if (vn.length > 200) {
    e.venue = t.err_venue_max ?? "Venue must be under 200 characters";
  } else if (!HAS_LETTER.test(vn)) {
    e.venue = t.err_venue_invalid ?? "Enter a valid venue name";
  }

  return e;
};
