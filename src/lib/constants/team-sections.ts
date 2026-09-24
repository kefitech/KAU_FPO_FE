/**
 * Team Sections
 * Section a team member belongs to — mirrors the backend TeamSection choices.
 * Order here is the display order in admin and on the public Our Team page.
 */

export const TEAM_SECTIONS = [
  { key: "patron", labelKey: "team_section_patron", fallback: "Patron" },
  {
    key: "principal_investigator",
    labelKey: "team_section_principal_investigator",
    fallback: "Principal Investigator",
  },
  { key: "co_investigator", labelKey: "team_section_co_investigator", fallback: "Co-Investigator" },
  {
    key: "pic_member",
    labelKey: "team_section_pic_member",
    fallback: "Project Implementation Committee Members",
  },
  { key: "technical_consultant", labelKey: "team_section_technical_consultant", fallback: "Technical Consultant" },
] as const;

export type TeamSectionKey = (typeof TEAM_SECTIONS)[number]["key"];

/** Patrons appear on the landing page; every other section on the Our Team page. */
export const PUBLIC_TEAM_PAGE_SECTIONS = TEAM_SECTIONS.filter((s) => s.key !== "patron");

/** Resolve a member's section, treating legacy rows (no section but is_patrons) as Patron. */
export function resolveTeamSection(member: { section?: string | null; is_patrons?: boolean }): TeamSectionKey | null {
  if (member.section && TEAM_SECTIONS.some((s) => s.key === member.section)) {
    return member.section as TeamSectionKey;
  }
  return member.is_patrons ? "patron" : null;
}
