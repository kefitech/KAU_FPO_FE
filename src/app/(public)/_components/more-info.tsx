import Image from "next/image";
import Link from "next/link";

const services = [
  {
    title: "Crop Husbandry",
    image: "https://celkau.in/image/logo1.jpg",
    href: "https://celkau.in/crops/index.php",
  },
  {
    title: "Animal Husbandry",
    image: "https://celkau.in/image/logo2.jpg",
    href: "https://celkau.in/Animalhusbandry/index.php",
  },
  {
    title: "Fisheries",
    image: "https://celkau.in/image/logo3.jpg",
    href: "https://celkau.in/Fisheries/index.php",
  },
  {
    title: "Forestry",
    image: "https://celkau.in/image/forestry%20icon.jpg",
    href: "https://celkau.in/Forestry/index.php",
  },
  {
    title: "KAU Moodle",
    image: "https://celkau.in/image/moodleicon1.jpg",
    href: "http://moodle.celkau.in/",
  },
  {
    title: "e-Crop Doctor",
    image: "https://celkau.in/image/ecrop%20doctor%20logo.png",
    href: "https://celkau.in/ecropdoctor/index.php",
  },
  {
    title: "Seed Rate & Spacing",
    image: "https://celkau.in/image/seedrate.png",
    href: "https://celkau.in/seedrate/index.php",
  },
  {
    title: "Fertulator",
    image: "https://celkau.in/image/logo12.png",
    href: "https://celkau.in/Fertilizer/index.php",
  },
  {
    title: "Agri Almanac",
    image: "https://celkau.in/image/logo4.png",
    href: "https://celkau.in/agrialmanac/agrialmanac.php",
  },
  {
    title: "Farm Machinery",
    image: "https://celkau.in/image/Machinery1.jpg",
    href: "https://celkau.in/Farm%20Machinery/index.php",
  },
  {
    title: "Agri Enterprises",
    image: "https://celkau.in/image/logo10.jpg",
    href: "https://celkau.in/Agrienterprises/index.php",
  },
  {
    title: "e-DID",
    image: "https://celkau.in/image/logo5.png",
    href: "http://edid.kau.in/",
  },
  {
    title: "Knowledge Bank",
    image: "https://celkau.in/image/Knowledge%20Bank.png",
    href: "https://celkau.in/Knowledge%20Bank/index.php",
  },
  {
    title: "Market Intelligence",
    image: "https://celkau.in/image/logo44.jpg",
    href: "https://celkau.in/market/index.php",
  },
  {
    title: "Agri Videos",
    image: "https://celkau.in/image/agrivideos.png",
    href: "https://celkau.in/agrivideos/index.php",
  },
  {
    title: "Weather Advisory",
    image: "https://celkau.in/image/WeeklyCrop.jpg",
    href: "https://celkau.in/weather.php",
  },
  {
    title: "Kerala Directory",
    image: "https://celkau.in/image/kerala.png",
    href: "https://celkau.in/kerala/kerala_directory.php",
  },
  {
    title: "Library",
    image: "https://celkau.in/image/library.png",
    href: "https://celkau.in/Library/index.php",
  },
];
export default function MoreInformation() {
  return (
    <section className="py-5">
      <div className="container-fluid px-5">
        <div className="text-center mb-5">
          <h2 className="heading">
            Agriculture Information Technologies & Services
          </h2>
        </div>

        <div className="row g-4 justify-content-center">
          {services.map((service) => (
            <div
              key={service.title}
              className="col-6 col-sm-4 col-md-2 col-lg-2">
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
                      alt={service.title}
                      width={140}
                      height={140}
                      style={{
                        objectFit: "contain",
                      }}
                    />
                  </div>

                  <h6 className="service-title">
                    {service.title}
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