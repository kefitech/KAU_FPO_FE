// Shared by the new-report and report-detail forms.

// Fixed height with vertical scroll, so long or unbroken text wraps instead of growing the field
export const SCROLL_TEXTAREA_CLASS =
  "field-sizing-fixed min-h-24 max-h-48 resize-none overflow-y-auto whitespace-pre-wrap wrap-anywhere";

// Today's date as YYYY-MM-DD in local time (IST); reports can't be dated in the future
export const todayLocalISO = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};
