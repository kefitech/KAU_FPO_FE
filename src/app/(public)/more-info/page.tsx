import AgrulLayout from "../_components/agrul-layout";
import BreadCrumb from "../_components/bread-crumb";
import MoreInformantion from "../_components/more-info";
export default function RegistrationProcess() {
  return (
    <AgrulLayout>
      <BreadCrumb title="More info" breadCrumb="More Informations and Technologies" />
      <MoreInformantion />
    </AgrulLayout>
  );
}