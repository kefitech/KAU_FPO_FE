import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import AgrulLayout from "../../_components/agrul-layout";
import BreadCrumb from "../../_components/bread-crumb";
import { galleryData } from "../../_data/gallery";

export default function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const project = galleryData.find((p) => p.id === parseInt(id));
  if (!project) notFound();

  const total = galleryData.length;
  const currentId = project.id;
  const previousId = currentId === 1 ? total : currentId - 1;
  const nextId = currentId === total ? 1 : currentId + 1;
  const previousProject = galleryData.find((p) => p.id === previousId);
  const nextProject = galleryData.find((p) => p.id === nextId);

  return (
    <AgrulLayout>
      <BreadCrumb title="Project Details" breadCrumb="Project Details" />
      <div className="project-details-area default-padding">
        <div className="container">
          <div className="project-details-items">
            <div className="project-thumb">
              <img src={`/assets/img/gallery/${project.thumb}`} alt={project.title} />
            </div>
            <div className="project-info text-light">
              <div className="content">
                <ul className="project-basic-info">
                  <li>Client <span>validthemes</span></li>
                  <li>Project Type <span>Website Growth</span></li>
                  <li>Date <span>25 February, 2024</span></li>
                  <li>Technology <span>React JS</span></li>
                </ul>
                <h2>{project.title}</h2>
                <p>
                  New had happen unable uneasy. Drawings can followed improved out sociable not. Earnestly so do instantly pretended. See general few civilly amiable pleased account carried. Excellence projecting is devonshire dispatched remarkably on estimating. Side in so life past.
                </p>
                <ul className="project-share">
                  <li>Share:</li>
                  <li><a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook-f" /></a></li>
                  <li><a href="https://www.x.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter" /></a></li>
                  <li><a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-linkedin-in" /></a></li>
                </ul>
              </div>
            </div>
            <div className="project-desc">
              <h2>Project Introduction</h2>
              <p>
                Continue indulged speaking the was out horrible for domestic position. Seeing rather her you not esteem men settle genius excuse. Deal say over you age from. Comparison new ham melancholy son themselves. Preference any astonished unreserved Mrs.
              </p>
              <p>
                Excellence projecting is devonshire dispatched remarkably on estimating. Side in so life past. Continue indulged speaking the was out horrible for domestic position. Seeing rather her you not esteem men settle genius excuse. Deal say over you age from.
              </p>
              <div className="row mt-35">
                <div className="col-lg-6">
                  <img src={`/assets/img/gallery/${project.thumb}`} alt={project.title} />
                </div>
                <div className="col-lg-6">
                  <h3>Main Goal</h3>
                  <p>
                    Excellence projecting is devonshire dispatched remarkably on estimating. Side in so life past. Continue indulged speaking the was out horrible for domestic.
                  </p>
                  <ul className="list-style-one mt-25">
                    <li>Agriculture Consulting</li>
                    <li>Custom farming rules</li>
                    <li>Real-time rate shopping</li>
                    <li>100 freight shipments / month</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="pagination">
              <div className="project-previous">
                <Link href={`/project-details/${previousId}`}>
                  <div className="icon"><i className="fas fa-angle-double-left" /></div>
                  <div className="nav-title">Previous Project <h5>{previousProject?.title}</h5></div>
                </Link>
              </div>
              <div className="all-project">
                <Link href="/project"><i className="fas fa-th" /></Link>
              </div>
              <div className="project-next">
                <Link href={`/project-details/${nextId}`}>
                  <div className="nav-title">Next Project <h5>{nextProject?.title}</h5></div>
                  <div className="icon"><i className="fas fa-angle-double-right" /></div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AgrulLayout>
  );
}
