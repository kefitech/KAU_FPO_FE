"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

const SERVICES = [
  { key: "service_crop_husbandry",    image: "https://celkau.in/image/logo1.jpg",               href: "https://celkau.in/crops/index.php" },
  { key: "service_animal_husbandry",  image: "https://celkau.in/image/logo2.jpg",               href: "https://celkau.in/Animalhusbandry/index.php" },
  { key: "service_fisheries",         image: "https://celkau.in/image/logo3.jpg",               href: "https://celkau.in/Fisheries/index.php" },
  { key: "service_forestry",          image: "https://celkau.in/image/forestry%20icon.jpg",     href: "https://celkau.in/Forestry/index.php" },
  { key: "service_kau_moodle",        image: "https://celkau.in/image/moodleicon1.jpg",         href: "http://moodle.celkau.in/" },
  { key: "service_ecrop_doctor",      image: "https://celkau.in/image/ecrop%20doctor%20logo.png", href: "https://celkau.in/ecropdoctor/index.php" },
  { key: "service_seed_rate",         image: "https://celkau.in/image/seedrate.png",            href: "https://celkau.in/seedrate/index.php" },
  { key: "service_fertulator",        image: "https://celkau.in/image/logo12.png",              href: "https://celkau.in/Fertilizer/index.php" },
  { key: "service_agri_almanac",      image: "https://celkau.in/image/logo4.png",              href: "https://celkau.in/agrialmanac/agrialmanac.php" },
  { key: "service_farm_machinery",    image: "https://celkau.in/image/Machinery1.jpg",          href: "https://celkau.in/Farm%20Machinery/index.php" },
  { key: "service_agri_enterprises",  image: "https://celkau.in/image/logo10.jpg",              href: "https://celkau.in/Agrienterprises/index.php" },
  { key: "service_edid",              image: "https://celkau.in/image/logo5.png",               href: "http://edid.kau.in/" },
  { key: "service_knowledge_bank",    image: "https://celkau.in/image/Knowledge%20Bank.png",    href: "https://celkau.in/Knowledge%20Bank/index.php" },
  { key: "service_market_intel",      image: "https://celkau.in/image/logo44.jpg",              href: "https://celkau.in/market/index.php" },
  { key: "service_agri_videos",       image: "https://celkau.in/image/agrivideos.png",          href: "https://celkau.in/agrivideos/index.php" },
  { key: "service_weather",           image: "https://celkau.in/image/WeeklyCrop.jpg",          href: "https://celkau.in/weather.php" },
  { key: "service_kerala_dir",        image: "https://celkau.in/image/kerala.png",              href: "https://celkau.in/kerala/kerala_directory.php" },
  { key: "service_library",           image: "https://celkau.in/image/library.png",             href: "https://celkau.in/Library/index.php" },
];

const FALLBACKS: Record<string, string> = {
  service_crop_husbandry:   "Crop Husbandry",
  service_animal_husbandry: "Animal Husbandry",
  service_fisheries:        "Fisheries",
  service_forestry:         "Forestry",
  service_kau_moodle:       "KAU Moodle",
  service_ecrop_doctor:     "e-Crop Doctor",
  service_seed_rate:        "Seed Rate & Spacing",
  service_fertulator:       "Fertulator",
  service_agri_almanac:     "Agri Almanac",
  service_farm_machinery:   "Farm Machinery",
  service_agri_enterprises: "Agri Enterprises",
  service_edid:             "e-DID",
  service_knowledge_bank:   "Knowledge Bank",
  service_market_intel:     "Market Intelligence",
  service_agri_videos:      "Agri Videos",
  service_weather:          "Weather Advisory",
  service_kerala_dir:       "Kerala Directory",
  service_library:          "Library",
};

export default function MoreInformation() {
  const locale = useLocaleStore((s) => s.locale);
  const [t, setT] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!locale) return;
    translationsApi.getPublic(locale, "home").then((data) => setT(data.home ?? {}));
  }, [locale]);

  return (
    <section className="py-5">
      <div className="container-fluid px-5">
        <div className="text-center mb-5">
          <h2 className="heading">
            {t.more_info_title ?? "Agriculture Information Technologies & Services"}
          </h2>
        </div>

        <div className="row g-4 justify-content-center">
          {SERVICES.map((service) => (
            <div key={service.key} className="col-6 col-sm-4 col-md-2 col-lg-2">
              <Link
                href={service.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-decoration-none"
              >
                <div className="service-card text-center">
                  <div className="service-image">
                    <Image
                      src={service.image}
                      alt={t[service.key] ?? FALLBACKS[service.key]}
                      width={140}
                      height={140}
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                  <h6 className="service-title">
                    {t[service.key] ?? FALLBACKS[service.key]}
                  </h6>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
