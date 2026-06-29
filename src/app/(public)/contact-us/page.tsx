import AgrulLayout from "../_components/agrul-layout";
import BreadCrumb from "../_components/bread-crumb";
import Contact from "../_components/contact";

export default function ContactPage() {
  return (
    <AgrulLayout>
      <BreadCrumb title="Contact Us" breadCrumb="Contact" />
      <Contact />
    </AgrulLayout>
  );
}
