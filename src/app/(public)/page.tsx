import { AboutSection } from "./_components/about-section";
import { AnnouncementsSection } from "./_components/announcements-section";
import { ContactSection } from "./_components/contact-section";
import { Features } from "./_components/features";
import { Footer } from "./_components/footer";
import { Hero } from "./_components/hero";
import { Navbar } from "./_components/navbar";
import { Portals } from "./_components/portals";
import { Stats } from "./_components/stats";
import { WhyChooseSection } from "./_components/why-choose-section";

export default function HomePage() {
  return (
    <div className="agrul-home">
      <Navbar />
      <main>
        <Hero />
        <AboutSection />
        <Features />
        <WhyChooseSection />
        <Stats />
        <Portals />
        <AnnouncementsSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}
