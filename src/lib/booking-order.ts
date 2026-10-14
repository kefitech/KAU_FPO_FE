type Schedulable = { requested_date: string; requested_time?: string | null };

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD HH:MM", so keys compare as strings. Times may arrive as HH:MM or HH:MM:SS. */
function whenKey(b: Schedulable) {
  return `${b.requested_date} ${(b.requested_time ?? "").slice(0, 5)}`;
}

/**
 * Comparator for the default booking order: upcoming bookings soonest-first,
 * then past ones most recent first. "Now" is fixed when the comparator is made
 * (local time, matching how requested_date/requested_time are entered).
 */
export function byUpcomingDate(now: Date = new Date()) {
  const nowKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return (a: Schedulable, b: Schedulable) => {
    const ka = whenKey(a);
    const kb = whenKey(b);
    const aUpcoming = ka >= nowKey;
    const bUpcoming = kb >= nowKey;
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
    return aUpcoming ? ka.localeCompare(kb) : kb.localeCompare(ka);
  };
}
