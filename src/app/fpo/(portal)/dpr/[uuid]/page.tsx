import { redirect } from "next/navigation";

/**
 * DPR wizard entry — routes straight to the first section.
 * The wizard shell (`layout.tsx`) does the actual UI heavy-lifting.
 */
export default async function DprWizardHomePage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;
  redirect(`/fpo/dpr/${uuid}/sections/components`);
}
