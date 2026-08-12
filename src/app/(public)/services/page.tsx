import AgrulLayout from "../_components/agrul-layout";
import BreadCrumb from "../_components/bread-crumb";
import ServicesSection from "../_components/services";

export default function ServicesPage() {
  return (
    <AgrulLayout>
      <BreadCrumb title="Services Offered" breadCrumb="Services" />
      <ServicesSection />
    </AgrulLayout>
  );
}
