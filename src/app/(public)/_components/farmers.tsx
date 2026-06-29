import Link from "next/link";
import { farmersData } from "../_data/farmers";

interface Props {
  showAll?: boolean;
}

const FarmersSection = ({ showAll = false }: Props) => {
  const farmers = showAll ? farmersData : farmersData.slice(0, 3);

  if (showAll) {
    return (
      <div className="farmer-area default-padding bottom-less">
        <div className="container">
          <div className="row">
            <div className="col-lg-10 offset-lg-1">
              <div className="row">
                {farmers.map((farmer) => (
                  <div className="col-lg-4 farmer-stye-one" key={farmer.id}>
                    <div className="farmer-style-one-item">
                      <div className="thumb">
                        <img src={`/assets/img/farmers/${farmer.thumb}`} alt={farmer.name} />
                        <div className="social">
                          <i className="fas fa-share-alt" />
                          <ul>
                            <li className="facebook"><a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook-f" /></a></li>
                            <li className="twitter"><a href="https://www.x.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter" /></a></li>
                            <li className="linkedin"><a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-linkedin-in" /></a></li>
                          </ul>
                        </div>
                      </div>
                      <div className="info">
                        <span>{farmer.title}</span>
                        <h4><Link href={`/team-details/${farmer.id}`}>{farmer.name}</Link></h4>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="farmer-area default-padding bottom-less bg-gray" style={{ backgroundImage: "url(/assets/img/shape/36.png)" }}>
      <div className="container">
        <div className="row">
          <div className="col-lg-8 offset-lg-2">
            <div className="site-heading text-center">
              <h5 className="sub-title">Our Farmers</h5>
              <h2 className="title">Meet Our Farm Experts</h2>
              <div className="devider" />
              <p>
                Everything melancholy uncommonly but solicitude inhabiting <br /> projection off. Connection stimulated estimating.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="container">
        <div className="row">
          <div className="col-lg-10 offset-lg-1">
            <div className="row">
              {farmers.map((farmer) => (
                <div className="col-lg-4 col-md-6 farmer-stye-one" key={farmer.id}>
                  <div className="farmer-style-one-item">
                    <div className="thumb">
                      <img src={`/assets/img/farmers/${farmer.thumb}`} alt={farmer.name} />
                      <div className="social">
                        <i className="fas fa-share-alt" />
                        <ul>
                          <li className="facebook"><a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-facebook-f" /></a></li>
                          <li className="twitter"><a href="https://www.x.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-twitter" /></a></li>
                          <li className="linkedin"><a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer"><i className="fab fa-linkedin-in" /></a></li>
                        </ul>
                      </div>
                    </div>
                    <div className="info">
                      <span>{farmer.title}</span>
                      <h4><Link href={`/team-details/${farmer.id}`}>{farmer.name}</Link></h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmersSection;
