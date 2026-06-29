import AgrulLayout from "../_components/agrul-layout";
import BreadCrumb from "../_components/bread-crumb";
import About from "../_components/about";
import FarmersSection from "../_components/farmers";
import Process from "../_components/process";
import Testimonial from "../_components/testimonial";
import WhyChoose from "../_components/why-choose";

export default function AboutUsPage() {
  return (
    <AgrulLayout>
      <BreadCrumb title="About Us" breadCrumb="About Us" />
      <About />
      <FarmersSection showAll={false} />
      <Process />
      <Testimonial />
      <WhyChoose />
    </AgrulLayout>
  );
}
