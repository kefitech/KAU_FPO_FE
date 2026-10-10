import type { ExpertBooking } from "@/app/expert/_api/dashboard";

// Live appointments first, then finished ones, then the ones that fell through.
const STATUS_ORDER: Record<string, number> = { confirmed: 0, pending: 1, completed: 2, cancelled: 3, rejected: 4 };

const LIVE_STATUSES = new Set(["confirmed", "pending"]);

function whenKey(b: ExpertBooking) {
  return `${b.requested_date} ${b.requested_time}`;
}

/** Live appointments soonest-first, then finished and cancelled ones newest-first. */
export function compareBookings(a: ExpertBooking, b: ExpertBooking) {
  const rank = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
  if (rank !== 0) return rank;
  return LIVE_STATUSES.has(a.status) ? whenKey(a).localeCompare(whenKey(b)) : whenKey(b).localeCompare(whenKey(a));
}

/**
 * Orders FPO groups (each already sorted with compareBookings, so its first row
 * is its soonest live appointment, or its newest finished one): FPOs with an
 * upcoming appointment first, soonest first; then the rest, most recent first.
 */
export function compareFpoGroups(a: ExpertBooking[], b: ExpertBooking[]) {
  const aLive = LIVE_STATUSES.has(a[0].status);
  const bLive = LIVE_STATUSES.has(b[0].status);
  if (aLive !== bLive) return aLive ? -1 : 1;
  return aLive ? whenKey(a[0]).localeCompare(whenKey(b[0])) : whenKey(b[0]).localeCompare(whenKey(a[0]));
}
