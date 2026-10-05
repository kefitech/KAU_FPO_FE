/** A KAU super admin / sub-admin remark on a training session. */
export interface TrainingSessionComment {
  id: number;
  comment: string;
  author_name: string;
  /** Saved at comment time — "Super Admin" or "Sub-Admin, <district>" */
  author_designation: string;
  created_at: string;
  /** set when the author edits the text — shown as "(edited)" */
  edited_at: string | null;
}
