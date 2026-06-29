"use client";
import { useState } from "react";

const Process = () => {
  const [activeTab, setActiveTab] = useState<"tab1" | "tab2">("tab2");

  return (
    <div className="process-area default-padding">
      <div className="container">
        <div className="row">
          <div className="col-lg-5 process-style-one">
            <h5 className="sub-title">Order process</h5>
            <h2 className="title">Order Now and <br /> get pure Organic Food</h2>
            <div className="call-to-action mt-45">
              <div className="icon">
                <i className="fas fa-user-headset" />
              </div>
              <div className="info">
                <span>Get quick support</span>
                <h4><a href="tel:2151234567">+12334598768</a></h4>
              </div>
            </div>
          </div>
          <div className="col-lg-7 process-style-one">
            <div className="row">
              <div className="shape">
                <img src="/assets/img/shape/35.webp" alt="shape" />
              </div>
              <div className="col-lg-4">
                <div className="nav nav-tabs order-process-tab-navs" id="nav-tab" role="tablist">
                  <button
                    className={`nav-link${activeTab === "tab1" ? " active" : ""}`}
                    type="button"
                    onClick={() => setActiveTab("tab1")}
                  >
                    <span>Process - 01 </span>
                    <strong>Home Delivary</strong>
                  </button>
                  <button
                    className={`nav-link${activeTab === "tab2" ? " active" : ""}`}
                    type="button"
                    onClick={() => setActiveTab("tab2")}
                  >
                    <span>Process - 02 </span>
                    <strong>Live Purchase</strong>
                  </button>
                </div>
              </div>
              <div className="col-lg-8">
                <div className="tab-content order-process-tab-content" id="nav-tabContent">
                  <div className={`tab-pane fade${activeTab === "tab1" ? " show active" : ""}`}>
                    <h3 className="title">Get products from home</h3>
                    <p>
                      Give lady of they such they sure it. Me contained explained education. Vulgar as hearts by garret. Perceived is determine departure explained no forfeited he something an join.
                    </p>
                    <ul>
                      <li>Product will be delivered to your door</li>
                      <li>The product will be checked before being sent to you.</li>
                    </ul>
                  </div>
                  <div className={`tab-pane fade${activeTab === "tab2" ? " show active" : ""}`}>
                    <div className="row align-center">
                      <h3 className="title">Collect food from the farm</h3>
                      <p>
                        Take join of they such they sure it. Me contained explained education. Vulgar as hearts by garret. Perceived is determine departure explained no forfeited he something an come.
                      </p>
                      <ul>
                        <li>You must come for purchasing the product</li>
                        <li>The product quality depends on your choice</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Process;
