import AgrulLayout from "../_components/agrul-layout";
import BreadCrumb from "../_components/bread-crumb";
import TeamSection from "../_components/team-section";

export default function TeamPage() {
  return (
    <AgrulLayout>
      <BreadCrumb title="Our Team" breadCrumb="Team" />
      <TeamSection showAll={true} />
    </AgrulLayout>
  );
}
