import { redirect } from "next/navigation";

import { DPR_SECTIONS } from "@/lib/api/dpr";

/**
 * DPR wizard entry — routes straight to the first section.
 * The wizard shell (`layout.tsx`) does the actual UI heavy-lifting.
 *
 * Uses DPR_SECTIONS[0] instead of hard-coding a key so adding a new step 0
 * (like §2.2 Project Identification) automatically updates the landing page.
 */
export default async function DprWizardHomePage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;
  const firstSectionKey = DPR_SECTIONS[0].key; // currently 'identification' (§2.2)
  redirect(`/fpo/dpr/${uuid}/sections/${firstSectionKey}`);
}
