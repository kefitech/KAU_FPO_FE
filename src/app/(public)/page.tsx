import AgrulLayout from "./_components/agrul-layout";
import Banner from "./_components/banner";
import About from "./_components/about";
import Services from "./_components/services";
import ProductList from "./_components/product-list";
import WhyChoose from "./_components/why-choose";
import Testimonial from "./_components/testimonial";
import FarmersSection from "./_components/farmers";
import Gallery from "./_components/gallery";
import Facts from "./_components/facts";
import Contact from "./_components/contact";
import Blog from "./_components/blog";
import NewsSourcesStrip from "./_components/news-sources";
import Documents from "./_components/documents";
import VisitorTracker from "./_components/visitor-tracker";

export default function HomePage() {
  return (
    <AgrulLayout>
      <VisitorTracker />
      <Banner />
      <About />
      <Services />
      <ProductList />
      <WhyChoose />
      <Testimonial />
      <FarmersSection />
      <Gallery />
      <Facts />
      <Contact />
      <Blog />
      <NewsSourcesStrip />
      <Documents />
    </AgrulLayout>
  );
}
