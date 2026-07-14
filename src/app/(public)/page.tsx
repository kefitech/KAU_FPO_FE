import About from "./_components/about";
import AgrulLayout from "./_components/agrul-layout";
import NewsWidget from "./_components/announcement-news";
import Banner from "./_components/banner";
import Contact from "./_components/contact";
import Documents from "./_components/documents";
import Facts from "./_components/facts";
import TeamSection from "./_components/team-section";
import Gallery from "./_components/gallery";
import HowToRegister from "./_components/how-to-register";
import NewsSourcesStrip from "./_components/news-sources";

import Services from "./_components/services";

import VisitorTracker from "./_components/visitor-tracker";
import WhyChoose from "./_components/why-choose";


export default function HomePage() {
  return (
    <AgrulLayout>
      <VisitorTracker />
      <Banner />
      <About />
      <HowToRegister />
      <TeamSection showAll={false} />
      <Services />
      {/* <ProductList /> */}
      <WhyChoose />
      {/* <Testimonial /> */}
      <Gallery />
      <Facts />
      <Contact />
     
      <NewsWidget />
      <NewsSourcesStrip />
      <Documents />
    </AgrulLayout>
  );
}
