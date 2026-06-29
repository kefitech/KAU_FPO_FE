"use client";
import { useState } from "react";

const Contact = () => {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", comments: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormData({ name: "", email: "", phone: "", comments: "" });
  };

  return (
    <div className="contact-area bg-gray default-padding" style={{ backgroundImage: "url(/assets/img/shape/28.png)" }}>
      <div className="container">
        <div className="row align-center">
          <div className="col-tact-stye-one col-lg-7">
            <div className="contact-form-style-one mb-md-50">
              <h5 className="sub-title">Have Questions?</h5>
              <h2 className="heading">Send us a Message</h2>
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-lg-12">
                    <div className="form-group">
                      <input className="form-control" name="name" placeholder="Name" type="text"
                        value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-lg-6">
                    <div className="form-group">
                      <input className="form-control" name="email" placeholder="Email*" type="email"
                        value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="form-group">
                      <input className="form-control" name="phone" placeholder="Phone" type="text"
                        value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-lg-12">
                    <div className="form-group comments">
                      <textarea className="form-control" name="comments" placeholder="Tell Us About Project *"
                        value={formData.comments} onChange={(e) => setFormData({ ...formData, comments: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="row">
                  <div className="col-lg-12">
                    <button type="submit"><i className="fa fa-paper-plane" /> Get in Touch</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
          <div className="col-tact-stye-one col-lg-5 pl-60 pl-md-15 pl-xs-15">
            <div className="contact-style-one-info">
              <h2>Contact{" "}<span>Information<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 150" preserveAspectRatio="none"><path d="M14.4,111.6c0,0,202.9-33.7,471.2,0c0,0-194-8.9-397.3,24.7c0,0,141.9-5.9,309.2,0" /></svg></span></h2>
              <p>Plan upon yet way get cold spot its week. Almost do am or limits hearts. Resolve parties but why she shewing.</p>
              <ul>
                <li data-aos="fade-up" data-aos-delay="100">
                  <div className="icon"><i className="fas fa-phone-alt" /></div>
                  <div className="content"><h5 className="title">Hotline</h5><a href="tel:+4733378901">+4733378901</a></div>
                </li>
                <li data-aos="fade-up" data-aos-delay="300">
                  <div className="icon"><i className="fas fa-map-marker-alt" /></div>
                  <div className="info"><h5 className="title">Our Location</h5><p>55 Main Street, The Grand Avenue 2nd Block, <br /> New York City</p></div>
                </li>
                <li data-aos="fade-up" data-aos-delay="500">
                  <div className="icon"><i className="fas fa-envelope-open-text" /></div>
                  <div className="info"><h5 className="title">Official Email</h5><a href="mailto:info@agrul.com">info@agrul.com</a></div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
