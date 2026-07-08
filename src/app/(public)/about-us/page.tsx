import AgrulLayout from "../_components/agrul-layout";
import BreadCrumb from "../_components/bread-crumb";
import About from "../_components/about";


export default function AboutUsPage() {
  return (
    <AgrulLayout>
      <BreadCrumb title="About Us" breadCrumb="About Us" />
      <About />
      {/* <FarmersSection showAll={false} />
      <Process />
      <Testimonial />
      <WhyChoose /> */}
    </AgrulLayout>
  );
}
