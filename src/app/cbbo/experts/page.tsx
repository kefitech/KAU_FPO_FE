import { ExpertDirectory } from "@/components/experts/expert-directory";

/** Read-only — browse the expert directory; contacting and booking are FPO-only. */
export default function CbboExpertsPage() {
  return <ExpertDirectory readOnly />;
}
