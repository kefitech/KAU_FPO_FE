import Link from "next/link";
import AgrulLayout from "../_components/agrul-layout";
import BreadCrumb from "../_components/bread-crumb";
import { galleryData } from "../_data/gallery";

export default function ProjectPage() {
  return (
    <AgrulLayout>
      <BreadCrumb title="Recent Projects" breadCrumb="Projects" />
      <div className="gallery-style-two-area default-padding">
        <div className="container">
          <div className="row">
            <div className="col-lg-8 offset-lg-2">
              <div className="site-heading text-center">
                <h5 className="sub-title">Our Projects</h5>
                <h2 className="title">Recent Completed Projects</h2>
                <div className="devider" />
              </div>
            </div>
          </div>
          <div className="row">
            {galleryData.map((item) => (
              <div className="col-xl-4 col-md-6 single-item" key={item.id}>
                <div className="gallery-style-one">
                  <img src={`/assets/img/gallery/${item.thumb}`} alt={item.title} />
                  <div className="overlay">
                    <span>{item.category}</span>
                    <h4>
                      <Link href={`/project-details/${item.id}`}>{item.title}</Link>
                    </h4>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AgrulLayout>
  );
}
