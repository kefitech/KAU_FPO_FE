"use client";
import { useState } from "react";
import { publicFetch } from "../_lib/public-fetch";

const EMPTY = { name: "", email: "", phone: "", subject: "", message: "" };

const Contact = () => {
  const [formData, setFormData] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof typeof EMPTY) =>
    (e: { target: { value: string } }) =>
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/feedback/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          subject: formData.subject,
          message: formData.message,
        }),
      });
      if (!res.ok) throw new Error();
      setSuccess(true);
      setFormData(EMPTY);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-area bg-gray default-padding" style={{ backgroundImage: "url(/assets/img/shape/28.png)" }}>
      <div className="container">
        <div className="row align-center">
          <div className="col-tact-stye-one col-lg-7">
            <div className="contact-form-style-one mb-md-50">
              <h5 className="sub-title">Have Questions?</h5>
              <h2 className="heading">Send us a Message</h2>

              {success ? (
                <div style={{
                  background: "#f0faf3",
                  border: "1px solid #b7e4c7",
                  borderRadius: 8,
                  padding: "32px 28px",
                  textAlign: "center",
                }}>
                  <i className="fas fa-check-circle" style={{ fontSize: 40, color: "#2d9c5a", marginBottom: 14, display: "block" }} />
                  <h4 style={{ color: "#1a6636", fontFamily: "var(--font-default)", marginBottom: 8 }}>Message Sent!</h4>
                  <p style={{ color: "#3a7d52", fontFamily: "var(--font-default)", fontSize: 14, margin: 0 }}>
                    Thank you for reaching out. We'll get back to you shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSuccess(false)}
                    style={{ marginTop: 20, background: "none", border: "none", color: "var(--color-primary)", fontFamily: "var(--font-default)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form className="contact-form" onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-lg-12">
                      <div className="form-group">
                        <input className="form-control" placeholder="Name *" type="text"
                          value={formData.name} onChange={set("name")} required />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-6">
                      <div className="form-group">
                        <input className="form-control" placeholder="Email *" type="email"
                          value={formData.email} onChange={set("email")} required />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="form-group">
                        <input className="form-control" placeholder="Phone (optional)" type="text"
                          value={formData.phone} onChange={set("phone")} />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-12">
                      <div className="form-group">
                        <input className="form-control" placeholder="Subject *" type="text"
                          value={formData.subject} onChange={set("subject")} required />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-12">
                      <div className="form-group comments">
                        <textarea className="form-control" placeholder="Your Message *"
                          value={formData.message} onChange={set("message")} required />
                      </div>
                    </div>
                  </div>
                  {error && (
                    <div style={{ marginBottom: 12, color: "#c0392b", fontSize: 13, fontFamily: "var(--font-default)" }}>
                      <i className="fas fa-exclamation-circle" style={{ marginRight: 6 }} />{error}
                    </div>
                  )}
                  <div className="row">
                    <div className="col-lg-12">
                      <button type="submit" disabled={submitting}>
                        {submitting
                          ? <><i className="fas fa-spinner fa-spin" /> Sending…</>
                          : <><i className="fa fa-paper-plane" /> Get in Touch</>}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
          <div className="col-tact-stye-one col-lg-5 pl-60 pl-md-15 pl-xs-15">
            <div className="contact-style-one-info">
              <h2>Contact{" "}<span>Information<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 150" preserveAspectRatio="none"><path d="M14.4,111.6c0,0,202.9-33.7,471.2,0c0,0-194-8.9-397.3,24.7c0,0,141.9-5.9,309.2,0" /></svg></span></h2>
              <p>Strengthening Farmer Producer Organizations through knowledge, technology, and institutional support.</p>
              <ul>
                <li data-aos="fade-up" data-aos-delay="100">
                  <div className="icon"><i className="fas fa-phone-alt" /></div>
                  <div className="content"><h5 className="title">Hotline</h5><a href="tel:+914872370509">+91 487 237 0509</a></div>
                </li>
                <li data-aos="fade-up" data-aos-delay="300">
                  <div className="icon"><i className="fas fa-map-marker-alt" /></div>
                  <div className="info"><h5 className="title">Our Location</h5><p>Kerala Agricultural University, KAU P.O.,<br />Vellanikkara, Thrissur - 680 656, Kerala</p></div>
                </li>
                <li data-aos="fade-up" data-aos-delay="500">
                  <div className="icon"><i className="fas fa-envelope-open-text" /></div>
                  <div className="info"><h5 className="title">Official Email</h5><a href="mailto:registrar@kau.in">registrar@kau.in</a></div>
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
