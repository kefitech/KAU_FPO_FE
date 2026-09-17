"use client";

import { useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";

import { translationsApi } from "@/lib/api/translations";
import { useLocaleStore } from "@/stores/locale-store";

const SERVICES = [
  {
    key: "service_crop_husbandry",
    image: "/assets/img/more-info/crop-husbandry.webp",
    href: "https://celkau.in/crops/index.php",
  },
  {
    key: "service_animal_husbandry",
    image: "/assets/img/more-info/animal-husbandry.webp",
    href: "https://celkau.in/Animalhusbandry/index.php",
  },
  {
    key: "service_fisheries",
    image: "/assets/img/more-info/fisheries.webp",
    href: "https://celkau.in/Fisheries/index.php",
  },
  {
    key: "service_forestry",
    image: "/assets/img/more-info/forestry.webp",
    href: "https://celkau.in/Forestry/index.php",
  },
  { key: "service_kau_moodle", image: "/assets/img/more-info/kau-moodle.webp", href: "http://moodle.celkau.in/" },
  {
    key: "service_ecrop_doctor",
    image: "/assets/img/more-info/ecrop-doctor.webp",
    href: "https://celkau.in/ecropdoctor/index.php",
  },
  {
    key: "service_seed_rate",
    image: "/assets/img/more-info/seed-rate.webp",
    href: "https://celkau.in/seedrate/index.php",
  },
  {
    key: "service_fertulator",
    image: "/assets/img/more-info/fertulator.webp",
    href: "https://celkau.in/Fertilizer/index.php",
  },
  {
    key: "service_agri_almanac",
    image: "/assets/img/more-info/agri-almanac.webp",
    href: "https://celkau.in/agrialmanac/agrialmanac.php",
  },
  {
    key: "service_farm_machinery",
    image: "/assets/img/more-info/farm-machinery.webp",
    href: "https://celkau.in/Farm%20Machinery/index.php",
  },
  {
    key: "service_agri_enterprises",
    image: "/assets/img/more-info/agri-enterprises.webp",
    href: "https://celkau.in/Agrienterprises/index.php",
  },
  { key: "service_edid", image: "/assets/img/more-info/edid.webp", href: "http://edid.kau.in/" },
  {
    key: "service_knowledge_bank",
    image: "/assets/img/more-info/knowledge-bank.webp",
    href: "https://celkau.in/Knowledge%20Bank/index.php",
  },
  {
    key: "service_market_intel",
    image: "/assets/img/more-info/market-intelligence.webp",
    href: "https://celkau.in/market/index.php",
  },
  {
    key: "service_agri_videos",
    image: "/assets/img/more-info/agri-videos.webp",
    href: "https://celkau.in/agrivideos/index.php",
  },
  {
    key: "service_weather",
    image: "/assets/img/more-info/weather-advisory.webp",
    href: "https://celkau.in/weather.php",
  },
  {
    key: "service_kerala_dir",
    image: "/assets/img/more-info/kerala-directory.webp",
    href: "https://celkau.in/kerala/kerala_directory.php",
  },
  { key: "service_library", image: "/assets/img/more-info/library.webp", href: "https://celkau.in/Library/index.php" },
];

const FALLBACKS: Record<string, string> = {
  service_crop_husbandry: "Crop Husbandry",
  service_animal_husbandry: "Animal Husbandry",
  service_fisheries: "Fisheries",
  service_forestry: "Forestry",
  service_kau_moodle: "KAU Moodle",
  service_ecrop_doctor: "e-Crop Doctor",
  service_seed_rate: "Seed Rate & Spacing",
  service_fertulator: "Fertulator",
  service_agri_almanac: "Agri Almanac",
  service_farm_machinery: "Farm Machinery",
  service_agri_enterprises: "Agri Enterprises",
  service_edid: "e-DID",
  service_knowledge_bank: "Knowledge Bank",
  service_market_intel: "Market Intelligence",
  service_agri_videos: "Agri Videos",
  service_weather: "Weather Advisory",
  service_kerala_dir: "Kerala Directory",
  service_library: "Library",
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
          <h2 className="heading">{t.more_info_title ?? "Agriculture Information Technologies & Services"}</h2>
        </div>

        <div className="service-grid">
          {SERVICES.map((service) => (
            <Link
              key={service.key}
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
                    className="service-img"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                </div>
                <h6 className="service-title">{t[service.key] ?? FALLBACKS[service.key]}</h6>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
