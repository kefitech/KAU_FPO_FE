"use client";
import { useRef, useState } from "react";

import { publicFetch } from "../_lib/public-fetch";

const EMPTY = { name: "", email: "", phone: "", subject: "", message: "" };

const Contact = () => {
  const [formData, setFormData] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  const fieldRefs: Record<string, React.RefObject<HTMLInputElement | HTMLTextAreaElement> | null> = {
    name: nameRef as React.RefObject<HTMLInputElement | HTMLTextAreaElement>,
    email: emailRef as React.RefObject<HTMLInputElement | HTMLTextAreaElement>,
    phone: phoneRef as React.RefObject<HTMLInputElement | HTMLTextAreaElement>,
    subject: subjectRef as React.RefObject<HTMLInputElement | HTMLTextAreaElement>,
    message: messageRef as React.RefObject<HTMLInputElement | HTMLTextAreaElement>,
  };

  const set = (field: keyof typeof EMPTY) => (e: { target: { value: string } }) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = "Name is required.";
    if (!formData.email.trim()) {
      errs.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = "Enter a valid email address.";
    }
    if (formData.phone && formData.phone.length !== 10) {
      errs.phone = "Phone number must be exactly 10 digits.";
    }
    if (!formData.subject.trim()) errs.subject = "Subject is required.";
    if (!formData.message.trim()) errs.message = "Message is required.";
    return errs;
  };

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError("");

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      const firstField = Object.keys(errs)[0];
      fieldRefs[firstField]?.current?.focus();
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
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

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const errors: Record<string, string[]> | undefined = data?.errors;

        if (errors) {
          const flattened = Object.fromEntries(Object.entries(errors).map(([field, messages]) => [field, messages[0]]));
          setFieldErrors(flattened);

          const firstField = Object.keys(flattened)[0];
          fieldRefs[firstField]?.current?.focus();

          return;
        }

        throw new Error(data?.message ?? "Something went wrong. Please try again.");
      }

      setSuccess(true);
      setFormData(EMPTY);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
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
                <div
                  style={{
                    background: "#f0faf3",
                    border: "1px solid #b7e4c7",
                    borderRadius: 8,
                    padding: "32px 28px",
                    textAlign: "center",
                  }}
                >
                  <i
                    className="fas fa-check-circle"
                    style={{ fontSize: 40, color: "#2d9c5a", marginBottom: 14, display: "block" }}
                  />
                  <h4 style={{ color: "#1a6636", fontFamily: "var(--font-default)", marginBottom: 8 }}>
                    Message Sent!
                  </h4>
                  <p style={{ color: "#3a7d52", fontFamily: "var(--font-default)", fontSize: 14, margin: 0 }}>
                    Thank you for reaching out. We'll get back to you shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSuccess(false)}
                    style={{
                      marginTop: 20,
                      background: "none",
                      border: "none",
                      color: "var(--color-primary)",
                      fontFamily: "var(--font-default)",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form className="contact-form" onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-lg-12">
                      <div className="form-group">
                        <input
                          ref={nameRef}
                          className="form-control"
                          placeholder="Name *"
                          type="text"
                          value={formData.name}
                          onChange={set("name")}
                          required
                        />
                        {fieldErrors.name && (
                          <div style={{ color: "#c0392b", fontSize: 12, marginTop: 4 }}>{fieldErrors.name}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-6">
                      <div className="form-group">
                        <input
                          ref={emailRef}
                          className="form-control"
                          placeholder="Email *"
                          type="text"
                          value={formData.email}
                          onChange={set("email")}
                          required
                        />
                        {fieldErrors.email && (
                          <div style={{ color: "#c0392b", fontSize: 12, marginTop: 4 }}>{fieldErrors.email}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="form-group">
                        <input
                          ref={phoneRef}
                          className="form-control"
                          placeholder="Phone (optional)"
                          type="text"
                          inputMode="numeric"
                          maxLength={10}
                          value={formData.phone}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                            setFormData((prev) => ({ ...prev, phone: digitsOnly }));
                          }}
                        />
                        {fieldErrors.phone && (
                          <div style={{ color: "#c0392b", fontSize: 12, marginTop: 4 }}>{fieldErrors.phone}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-12">
                      <div className="form-group">
                        <input
                          ref={subjectRef}
                          className="form-control"
                          placeholder="Subject *"
                          type="text"
                          value={formData.subject}
                          onChange={set("subject")}
                          required
                        />
                        {fieldErrors.subject && (
                          <div style={{ color: "#c0392b", fontSize: 12, marginTop: 4 }}>{fieldErrors.subject}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-12">
                      <div className="form-group comments">
                        <textarea
                          ref={messageRef}
                          className="form-control"
                          placeholder="Your Message *"
                          value={formData.message}
                          onChange={set("message")}
                          required
                          required
                        />
                        {fieldErrors.message && (
                          <div style={{ color: "#c0392b", fontSize: 12, marginTop: 4 }}>{fieldErrors.message}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  {error && (
                    <div
                      style={{ marginBottom: 12, color: "#c0392b", fontSize: 13, fontFamily: "var(--font-default)" }}
                    >
                      <i className="fas fa-exclamation-circle" style={{ marginRight: 6 }} />
                      {error}
                    </div>
                  )}
                  <div className="row">
                    <div className="col-lg-12">
                      <button type="submit" disabled={submitting}>
                        {submitting ? (
                          <>
                            <i className="fas fa-spinner fa-spin" /> Sending…
                          </>
                        ) : (
                          <>
                            <i className="fa fa-paper-plane" /> Get in Touch
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
          <div className="col-tact-stye-one col-lg-5 pl-60 pl-md-15 pl-xs-15">
            <div className="contact-style-one-info">
              <h2>
                Contact <span>Information</span>
              </h2>
              <p>
                Strengthening Farmer Producer Organizations through knowledge, technology, and institutional support.
              </p>
              <ul>
                <li data-aos="fade-up" data-aos-delay="100">
                  <div className="icon">
                    <i className="fas fa-phone-alt" />
                  </div>
                  <div className="content">
                    <h5 className="title">Hotline</h5>
                    <a href="tel:+914872370509">+91 487 237 0509</a>
                  </div>
                </li>
                <li data-aos="fade-up" data-aos-delay="300">
                  <div className="icon">
                    <i className="fas fa-map-marker-alt" />
                  </div>
                  <div className="info">
                    <h5 className="title">Our Location</h5>
                    <p>
                      Kerala Agricultural University, KAU P.O.,
                      <br />
                      Vellanikkara, Thrissur - 680 656, Kerala
                    </p>
                  </div>
                </li>
                <li data-aos="fade-up" data-aos-delay="500">
                  <div className="icon">
                    <i className="fas fa-envelope-open-text" />
                  </div>
                  <div className="info">
                    <h5 className="title">Official Email</h5>
                    <a href="mailto:registrar@kau.in">registrar@kau.in</a>
                  </div>
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
