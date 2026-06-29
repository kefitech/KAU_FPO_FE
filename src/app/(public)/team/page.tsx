import AgrulLayout from "../_components/agrul-layout";
import BreadCrumb from "../_components/bread-crumb";
import FarmersSection from "../_components/farmers";

export default function TeamPage() {
  return (
    <AgrulLayout>
      <BreadCrumb title="Farm Members" breadCrumb="Team" />
      <FarmersSection showAll={true} />
    </AgrulLayout>
  );
}
