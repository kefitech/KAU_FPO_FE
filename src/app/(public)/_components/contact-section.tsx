"use client";

import { useState } from "react";

export function ContactSection() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div
      id="contact"
      className="contact-area bg-gray default-padding"
      style={{ backgroundImage: "url(/images/agrul/shape/28.png)" }}
    >
      <div className="container">
        <div className="row align-center">
          {/* Form */}
          <div className="col-tact-stye-one col-lg-7">
            <div className="contact-form-style-one mb-md-50">
              <h5 className="sub-title">Have Questions?</h5>
              <h2 className="heading">Send us a Message</h2>

              {submitted ? (
                <div className="alert alert-success mt-20">
                  Thank you! We will get back to you shortly.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="contact-form">
                  <div className="row">
                    <div className="col-lg-6">
                      <div className="form-group">
                        <input
                          className="form-control"
                          type="text"
                          placeholder="Your Name *"
                          required
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="form-group">
                        <input
                          className="form-control"
                          type="email"
                          placeholder="Email Address *"
                          required
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-lg-12">
                      <div className="form-group">
                        <input
                          className="form-control"
                          type="tel"
                          placeholder="Phone Number"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-lg-12">
                      <div className="form-group">
                        <textarea
                          className="form-control"
                          placeholder="Your Message *"
                          rows={6}
                          required
                          value={form.message}
                          onChange={(e) => setForm({ ...form, message: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-lg-12">
                      <button type="submit" className="btn btn-theme btn-md radius animation">
                        Send Message
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="col-tact-stye-one col-lg-5 pl-60 pl-md-15 pl-xs-15">
            <div className="contact-style-one-info">
              <h2>
                Contact{" "}
                <span>
                  Information
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 150" preserveAspectRatio="none">
                    <path d="M14.4,111.6c0,0,202.9-33.7,471.2,0c0,0-194-8.9-397.3,24.7c0,0,141.9-5.9,309.2,0" />
                  </svg>
                </span>
              </h2>
              <p>
                Have questions about the KAU-FPO Linkage Programme? We are here to help
                your Farmer Producer Organization succeed.
              </p>
              <ul>
                <li>
                  <div className="icon">
                    <i className="fas fa-phone-alt" />
                  </div>
                  <div className="content">
                    <h5 className="title">Hotline</h5>
                    <a href="tel:+914872438011">+91 487 243 8011</a>
                  </div>
                </li>
                <li>
                  <div className="icon">
                    <i className="fas fa-map-marker-alt" />
                  </div>
                  <div className="info">
                    <h5 className="title">Our Location</h5>
                    <p>Kerala Agricultural University,<br /> Thrissur, Kerala — 680656</p>
                  </div>
                </li>
                <li>
                  <div className="icon">
                    <i className="fas fa-envelope-open-text" />
                  </div>
                  <div className="info">
                    <h5 className="title">Official Email</h5>
                    <a href="mailto:info@kau.in">info@kau.in</a>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
