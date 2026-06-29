import { use } from "react";
import { notFound } from "next/navigation";
import AgrulLayout from "../../_components/agrul-layout";
import BreadCrumb from "../../_components/bread-crumb";
import { farmersData } from "../../_data/farmers";

const skillData = [
  { id: 1, title: "Cereals", end: 88 },
  { id: 2, title: "Fruit", end: 95 },
  { id: 3, title: "Vegetables", end: 80 },
];

export default function TeamDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const farmer = farmersData.find((f) => f.id === parseInt(id));
  if (!farmer) notFound();

  return (
    <AgrulLayout>
      <BreadCrumb title="Team Details" breadCrumb="Team Details" />
      <div className="farmer-single-area bg-gray default-padding-top">
        <div className="container">
          <div className="farmer-content-top">
            <div className="row">
              <div className="col-lg-5 left-info">
                <div className="thumb">
                  <img src={`/assets/img/farmers/${farmer.thumb}`} alt={farmer.name} />
                </div>
              </div>
              <div className="col-lg-7 right-info">
                <h2>{farmer.name}</h2>
                <span>{farmer.title}</span>
                <p>
                  Bring to the table win-win survival strategies to ensure proactive domination. At the end of the day, going forward, a new normal that has evolved from generation is on the runway heading towards a streamlined cloud solution. User generated content in real-time will have multiple touchpoints for offshoring house in never fruit up.
                </p>
                <ul className="team-list mt-25">
                  <li>Effective plans for both short-term and long-term objectives.</li>
                  <li>Try improving your interpersonal skills by relationships</li>
                  <li>Most of them are smart, tech-savvy, researchers, and incredible entrepreneurs.</li>
                  <li>Animals and Crops Management Skills</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="bottom-info bg-light default-padding">
          <div className="container">
            <div className="row">
              <div className="col-lg-6 pr-50 pr-md-15 pr-xs-15">
                <div className="personal-info">
                  <h2 className="title">Personal Info</h2>
                  <p>
                    Ignissimos ducimus quin blandiitis praesentium voluptatem deleniti atque corrupti quos dolores et quas molestias excepturi.
                  </p>
                  <ul>
                    <li><strong>Address:</strong> 5919 Trussville Crossings Pkwy, Birmingham</li>
                    <li><strong>Phone:</strong> <a href="tel:+442073284499">+44-20-7328-4499</a></li>
                  </ul>
                  <ul className="social-info mt-20">
                    <li className="facebook"><a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook-f" /></a></li>
                    <li className="twitter"><a href="https://www.x.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter" /></a></li>
                    <li className="linkedin"><a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-linkedin-in" /></a></li>
                  </ul>
                </div>
              </div>
              <div className="col-lg-6">
                <div className="skill-items">
                  {skillData.map((skill) => (
                    <div className="skill-item" key={skill.id}>
                      <div className="progress-box">
                        <h5>{skill.title}</h5>
                        <div className="progress">
                          <div
                            className="progress-bar"
                            role="progressbar"
                            style={{ width: `${skill.end}%` }}
                            aria-valuenow={skill.end}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          />
                        </div>
                        <span className="percent">{skill.end}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AgrulLayout>
  );
}
