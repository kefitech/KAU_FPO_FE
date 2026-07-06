import About from "./_components/about";
import AgrulLayout from "./_components/agrul-layout";
import Blog from "./_components/announcement-news";
import Banner from "./_components/banner";
import Contact from "./_components/contact";
import Documents from "./_components/documents";
import Facts from "./_components/facts";
import FarmersSection from "./_components/farmers";
import Gallery from "./_components/gallery";
import NewsSourcesStrip from "./_components/news-sources";
import ProductList from "./_components/product-list";
import Services from "./_components/services";
import Testimonial from "./_components/testimonial";
import VisitorTracker from "./_components/visitor-tracker";
import WhyChoose from "./_components/why-choose";

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
      <FarmersSection showAll={true} />
      <Gallery />
      <Facts />
      <Contact />
      <Blog />
      <NewsSourcesStrip />
      <Documents />
    </AgrulLayout>
  );
}
