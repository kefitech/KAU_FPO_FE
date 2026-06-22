import Link from "next/link";
import Image from "next/image";

const ABOUT_ITEMS = [
  {
    id: 1,
    icon: "🌾",
    title: "Natural Farming",
    description: "Promoting sustainable and natural farming practices across Kerala's FPOs.",
  },
  {
    id: 2,
    icon: "✅",
    title: "Quality Assurance",
    description: "Ensuring high-quality agricultural produce through expert guidance.",
  },
];

export function AboutSection() {
  return (
    <div id="about" className="about-style-one-area default-padding">
      <div className="shape-right-top">
        <Image src="/images/agrul/shape/leaf.png" alt="shape" width={80} height={80} />
      </div>

      <div className="container">
        <div className="row align-center">
          {/* Images */}
          <div className="col-xl-5 col-lg-6 about-style-one pr-50 pr-md-15 pr-xs-15">
            <div className="thumb">
              <Image src="/images/agrul/about/5.jpg" alt="About KAU-FPO" width={500} height={600} />
              <div className="sub-item">
                <Image src="/images/agrul/about/1.jpg" alt="FPO Farming" width={250} height={300} />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="col-xl-7 col-lg-6 about-style-one">
            <div className="row align-center">
              <div className="col-xl-7 col-lg-12">
                <h2 className="heading">
                  Agriculture For <br /> Future Development
                </h2>
                <p>
                  The KAU-FPO Linkage Programme is Kerala Agricultural University&apos;s initiative
                  to digitally empower Farmer Producer Organizations across Kerala. Our AI-based
                  platform bridges the gap between farmers, experts, government schemes, and markets.
                </p>
                <ul className="check-solid-list mt-20">
                  <li>AI-powered crop recommendations for Kerala conditions</li>
                  <li>Direct access to expert agronomists and consultants</li>
                  <li>Seamless integration with government welfare schemes</li>
                </ul>
              </div>
              <div className="col-xl-5 col-lg-12 pl-50 pl-md-15 pl-xs-15">
                {ABOUT_ITEMS.map((item) => (
                  <div key={item.id} className="top-product-item">
                    <span style={{ fontSize: 36 }}>{item.icon}</span>
                    <h5>
                      <Link href="#">{item.title}</Link>
                    </h5>
                    <p>{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
