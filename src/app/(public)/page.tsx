import { AboutSection } from "./_components/about-section";
import { AnnouncementsSection } from "./_components/announcements-section";
import { ExpertsSection } from "./_components/experts-section";
import { Footer } from "./_components/footer";
import { FaqSection } from "./_components/faq-section";
import { Hero } from "./_components/hero";
import { HowToRegisterSection } from "./_components/how-to-register-section";
import { Navbar } from "./_components/navbar";
import { Portals } from "./_components/portals";
import { SchemesSection } from "./_components/schemes-section";
import { Stats } from "./_components/stats";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <AboutSection />
        <AnnouncementsSection />
        <SchemesSection />
        <ExpertsSection />
        <FaqSection />
        <HowToRegisterSection />
        <Portals />
      </main>
      <Footer />
    </div>
  );
}
