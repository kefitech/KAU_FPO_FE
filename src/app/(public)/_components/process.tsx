"use client";
import { useEffect, useState } from "react";
import { publicFetch } from "../_lib/public-fetch";


interface ProcessData {
  how_to_register: string;
}


const Process = () => {
  const [activeTab, setActiveTab] = useState<"tab1" | "tab2" | "tab3" | "tab4" | "tab5" | "tab6"| "tab7" | "tab8" | "tab9" | "tab10">("tab1");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProcessData | null>(null);

  useEffect(() => {
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/site-content/`)
    .then((res) => res.json())
    .then((json) => {
      setData(json.data);
      })
    .catch((err) => {
      console.error(err);
    })
    .finally(() => setLoading(false));
  }, []);
  if (!data) {
    return null;
  }


  return (
    <div className="process-area default-padding">
      <div className="container">
        <div className="row">
          <div className="col-lg-5 process-style-one">
            <h3 className="title">How to register</h3>
            <p> A Farmer Producer Organization (FPO) is a 
            legally registered entity owned and governed 
            by farmers for improving access to inputs, 
            technology, credit, processing facilities, and markets.
            </p>
            


            
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
              <div className="col-lg-2">
                <div className="nav nav-tabs order-process-tab-navs" id="nav-tab" role="tablist">
                  <button
                    className={`nav-link${activeTab === "tab1" ? " active" : ""}`}
                    type="button"
                    onClick={() => setActiveTab("tab1")}
                  >
                    <strong>Step - 01 </strong>
                   
                  </button>
                  <button
                    className={`nav-link${activeTab === "tab2" ? " active" : ""}`}
                    type="button"
                    onClick={() => setActiveTab("tab2")}
                  >
                    <strong>Step - 02 </strong>
                    
                  </button>
                  <button
                    className={`nav-link${activeTab === "tab3" ? " active" : ""}`}
                    type="button"
                    onClick={() => setActiveTab("tab3")}
                  >
                    <strong>Step - 03 </strong>
                  </button>
                  <button
                    className={`nav-link${activeTab === "tab4" ? " active" : ""}`}
                    type="button"
                    onClick={() => setActiveTab("tab4")}
                  >
                    <strong>Step - 04 </strong>
                    
                  </button>
                  <button
                    className={`nav-link${activeTab === "tab5" ? " active" : ""}`}
                    type="button"
                    onClick={() => setActiveTab("tab5")}
                  >
                    <span>Step - 05 </span>
                    <strong>Live Purchase</strong>
                  </button>
                  <button
                    className={`nav-link${activeTab === "tab6" ? " active" : ""}`}
                    type="button"
                    onClick={() => setActiveTab("tab6")}
                  >
                    <span>Step - 06 </span>
                    <strong>Live Purchase</strong>
                  </button>
                  <button
                    className={`nav-link${activeTab === "tab7" ? " active" : ""}`}
                    type="button"
                    onClick={() => setActiveTab("tab7")}
                  >
                    <span>Step - 07 </span>
                    <strong>Live Purchase</strong>
                  </button>
                  <button
                    className={`nav-link${activeTab === "tab8" ? " active" : ""}`}
                    type="button"
                    onClick={() => setActiveTab("tab8")}
                  >
                    <span>Step - 08 </span>
                    <strong>Live Purchase</strong>
                  </button>
                  <button
                    className={`nav-link${activeTab === "tab9" ? " active" : ""}`}
                    type="button"
                    onClick={() => setActiveTab("tab9")}
                  >
                    <span>Step - 09 </span>
                    <strong>Live Purchase</strong>
                  </button>
                  <button
                    className={`nav-link${activeTab === "tab10" ? " active" : ""}`}
                    type="button"
                    onClick={() => setActiveTab("tab10")}
                  >
                    <span>Step - 10 </span>
                    <strong>Live Purchase</strong>
                  </button>
                </div>
              </div>
              <div className="col-lg-8">
                <div className="tab-content order-process-tab-content" id="nav-tabContent">
                  <div className={`tab-pane fade${activeTab === "tab1" ? " show active" : ""}`}>
                    <h3 className="title">Get products from home</h3>
                                           
                    <ul>
                      <li>Mobilize the Required Farmer Members</li>
                      <li>Organize a group of eligible farmers.</li>
                      <li>Minimum 10 producer members required for a Producer Company.</li>

                    </ul>
                  </div>
                  <div className={`tab-pane fade${activeTab === "tab2" ? " show active" : ""}`}>
                    <div className="row align-center">
                      <h3 className="title">Collect food from the farm</h3>
                      {/* <p>
                        Take join of they such they sure it. Me contained explained education. Vulgar as hearts by garret. Perceived is determine departure explained no forfeited he something an come.
                      </p> */}
                      <ul>
                        <li>Obtain Digital Signature Certificates (DSC)</li>
                        <li>Mandatory for electronic filing with MCA.</li>
                        <li>Class 3 DSC required for Directors.</li>
                      </ul>
                    </div>
                  </div>
                  <div className={`tab-pane fade${activeTab === "tab3" ? " show active" : ""}`}>
                    <div className="row align-center">
                      <h3 className="title">Collect food from the farm</h3>
                      {/* <p>
                        Take join of they such they sure it. Me contained explained education. Vulgar as hearts by garret. Perceived is determine departure explained no forfeited he something an come.
                      </p> */}
                      <ul>
                        <li>Apply for Director Identification Number (DIN)</li>
                        <li>Every Director must possess a valid DIN.</li>
                      </ul>
                    </div>
                  </div>
                  <div className={`tab-pane fade${activeTab === "tab4" ? " show active" : ""}`}>
                    <div className="row align-center">
                      <h3 className="title">Collect food from the farm</h3>
                      {/* <p>
                        Take join of they such they sure it. Me contained explained education. Vulgar as hearts by garret. Perceived is determine departure explained no forfeited he something an come.
                      </p> */}
                      <ul>
                        <li>Reserve the Company Name</li>
                        <li>Must be unique and end with \"Producer Company Limited\".</li>
                      </ul>
                    </div>
                  </div>
                  <div className={`tab-pane fade${activeTab === "tab5" ? " show active" : ""}`}>
                    <div className="row align-center">
                      <h3 className="title">Collect food from the farm</h3>
                      {/* <p>
                        Take join of they such they sure it. Me contained explained education. Vulgar as hearts by garret. Perceived is determine departure explained no forfeited he something an come.
                      </p> */}
                      <ul>
                        <li>Prepare the Memorandum and Articles of Association</li>
                        <li>MoA defines objectives; AoA defines governance structure.</li>
                      </ul>
                    </div>
                  </div>
                  <div className={`tab-pane fade${activeTab === "tab6" ? " show active" : ""}`}>
                    <div className="row align-center">
                      <h3 className="title">Collect food from the farm</h3>
                      {/* <p>
                        Take join of they such they sure it. Me contained explained education. Vulgar as hearts by garret. Perceived is determine departure explained no forfeited he something an come.
                      </p> */}
                      <ul>
                        <li>Submit the SPICe+ Incorporation Application</li>
                        <li>Submitted online through the MCA SPICe+ system</li>
                      </ul>
                    </div>
                  </div>
                  <div className={`tab-pane fade${activeTab === "tab7" ? " show active" : ""}`}>
                    <div className="row align-center">
                      <h3 className="title">Collect food from the farm</h3>
                      {/* <p>
                        Take join of they such they sure it. Me contained explained education. Vulgar as hearts by garret. Perceived is determine departure explained no forfeited he something an come.
                      </p> */}
                      <ul>
                        <li>Obtain the Certificate of Incorporation\\n\nPHASE II: POST-INCORPORATION SETUP</li>
                        <li>From Registrar of Companies (RoC). Confirms legal existence and CIN.</li>
                      </ul>
                    </div>
                  </div>
                  <div className={`tab-pane fade${activeTab === "tab8" ? " show active" : ""}`}>
                    <div className="row align-center">
                      <h3 className="title">Collect food from the farm</h3>
                      <p>
                        Obtain PAN and TAN.
                      </p>
                      <ul>
                        <li>Required for bank accounts, tax compliance, and financial transactions</li>
                      </ul>
                    </div>
                  </div>
                  <div className={`tab-pane fade${activeTab === "tab9" ? " show active" : ""}`}>
                    <div className="row align-center">
                      <h3 className="title">Collect food from the farm</h3>
                      <p>
                        Open a Bank Account
                      </p>
                      <ul>
                        <li>A dedicated current account in the name of the Producer Company</li>
                      </ul>
                    </div>
                  </div>
                  <div className={`tab-pane fade${activeTab === "tab10" ? " show active" : ""}`}>
                    <div className="row align-center">
                      <h3 className="title">Collect food from the farm</h3>
                      {/* <p>
                        Take join of they such they sure it. Me contained explained education. Vulgar as hearts by garret. Perceived is determine departure explained no forfeited he something an come.
                      </p> */}
                      <ul>
                        <li>Collect Share Capital and Commence Operations</li>
                        <li>Issue shares, deposit capital, maintain registers, and begin business activities.</li>
                        
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
