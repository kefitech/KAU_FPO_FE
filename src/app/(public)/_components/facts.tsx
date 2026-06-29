"use client";
import CountUp from "react-countup";
import { factData } from "../_data/facts";

const Facts = () => {
  return (
    <div className="fun-facts-area default-padding">
      <div className="shape-left"><img src="/assets/img/shape/27.png" alt="shape" /></div>
      <div className="container">
        <div className="item-inner">
          <div className="shape-right"><img src="/assets/img/shape/26.png" alt="shape" /></div>
          <div className="row">
            <div className="col-lg-4 fun-fact-style-one">
              <div className="heading">
                <div className="sub-title">Achievements</div>
                <h2 className="title">Delivering value <br /> since 1956</h2>
              </div>
            </div>
            <div className="col-lg-8 fun-fact-style-one text-end">
              <div className="row">
                {factData.map((fact) => (
                  <div key={fact.id} className="col-lg-4 col-md-4 item">
                    <div className="fun-fact">
                      <div className="counter">
                        <div className="timer"><CountUp end={fact.end} enableScrollSpy /></div>
                        <div className="operator">{fact.unit}</div>
                      </div>
                      <span className="medium">{fact.title}</span>
                    </div>
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

export default Facts;
