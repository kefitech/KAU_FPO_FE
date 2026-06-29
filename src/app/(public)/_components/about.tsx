import Link from "next/link";
import { aboutData } from "../_data/about";

const About = () => {
  return (
    <div className="about-style-one-area default-padding">
      <div className="shape-right-top">
        <img src="/assets/img/shape/leaf.png" alt="leaf shape" />
      </div>
      <div className="container">
        <div className="row align-center">
          <div className="col-xl-5 col-lg-6 about-style-one pr-50 pr-md-15 pr-xs-15">
            <div className="thumb">
              <img src="/assets/img/about/5.jpg" alt="About" />
              <div className="sub-item">
                <img src="/assets/img/about/1.jpg" alt="About" />
              </div>
            </div>
          </div>
          <div className="col-xl-7 col-lg-6 about-style-one">
            <div className="row align-center">
              <div className="col-xl-7 col-lg-12">
                <h2 className="heading">Agriculture For <br /> Future Development</h2>
                <p>
                  There are many variations of passages of ipsum available but the majority
                  have suffered alteration in some form by injected humor or random word
                  which don&apos;t look even. Comparison new ham melancholy son themselves.
                </p>
                <ul className="check-solid-list mt-20">
                  <li>Organic food contains more vitamins</li>
                  <li>Eat organic because supply meets demand</li>
                  <li>Organic food is never irradiated</li>
                </ul>
              </div>
              <div className="col-xl-5 col-lg-12 pl-50 pl-md-15 pl-xs-15">
                {aboutData.map((item) => (
                  <div key={item.id} className="top-product-item">
                    <img src={`/assets/img/icon/${item.icon}`} alt="Icon" />
                    <h5><Link href="#">{item.title}</Link></h5>
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
};

export default About;
