import AgrulLayout from "../_components/agrul-layout";
import BreadCrumb from "../_components/bread-crumb";
import HowToRegister from "../_components/how-to-register";

export default function RegistrationProcess() {
  return (
    <AgrulLayout>
      <BreadCrumb title="How To Register" breadCrumb="How To Register" />
      <HowToRegister />
    </AgrulLayout>
  );
}