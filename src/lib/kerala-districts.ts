/**
 * Kerala's 14 districts — matches the backend `apps.core.utils.constants.District` enum.
 * The `code` field is what backend/master-data APIs expect when filtering
 * blocks / panchayats etc.; the `name` field is what we store on plain
 * CharField fields and what users see in the UI.
 *
 * Also shared with the admin dpr projects page filter.
 */
export const KERALA_DISTRICTS: ReadonlyArray<{ code: string; name: string }> = [
  { code: "TVM", name: "Thiruvananthapuram" }, { code: "KLM", name: "Kollam" },
  { code: "PTA", name: "Pathanamthitta" },    { code: "ALP", name: "Alappuzha" },
  { code: "KTM", name: "Kottayam" },          { code: "IDK", name: "Idukki" },
  { code: "EKM", name: "Ernakulam" },         { code: "TRS", name: "Thrissur" },
  { code: "PKD", name: "Palakkad" },          { code: "MLP", name: "Malappuram" },
  { code: "KZD", name: "Kozhikode" },         { code: "WYD", name: "Wayanad" },
  { code: "KNR", name: "Kannur" },            { code: "KSD", name: "Kasaragod" },
];

/** SearchableSelect-compatible options — value = code, label = "Name (Code)". */
export const KERALA_DISTRICT_OPTIONS = KERALA_DISTRICTS.map((d) => ({
  value: d.name,
  label: d.name,
}));
