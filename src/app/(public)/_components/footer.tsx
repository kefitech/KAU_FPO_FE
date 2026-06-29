"use client";
import Link from "next/link";
import { useState } from "react";

const Footer = () => {
  const [email, setEmail] = useState("");

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    setEmail("");
    alert("Thanks For Subscribing!");
  };

  return (
    <footer className="bg-dark text-light" style={{ backgroundImage: "url(/assets/img/shape/brush-down.png)" }}>
      <div className="container">
        <div className="f-items default-padding">
          <div className="row">
            <div className="col-lg-4 col-md-6 item">
              <div className="footer-item about">
                <img className="logo" src="/assets/img/logo-light.png" alt="Logo" />
                <p>
                  Happen active county. Winding morning ambition shyness evident to poor.
                  Because elderly new to the point to main success.
                </p>
                <form onSubmit={handleNewsletter} className="newsletter-form">
                  <input type="email" placeholder="Your Email" className="form-control"
                    value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <button type="submit">Go</button>
                </form>
              </div>
            </div>

            <div className="col-lg-2 col-md-6 item">
              <div className="footer-item link">
                <h4 className="widget-title">Explore</h4>
                <ul>
                  <li><Link href="/about-us">About Us</Link></li>
                  <li><Link href="/team">Meet Our Team</Link></li>
                  <li><Link href="/blog-standard">News &amp; Media</Link></li>
                  <li><Link href="/services">Services</Link></li>
                  <li><Link href="/contact-us">Contact Us</Link></li>
                </ul>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 item">
              <div className="footer-item recent-post">
                <h4 className="widget-title">Recent Posts</h4>
                <ul>
                  <li>
                    <div className="thumb">
                      <Link href="/blog-single-with-sidebar/1">
                        <img src="/assets/img/thumbs/3.jpg" alt="Thumb" />
                      </Link>
                    </div>
                    <div className="info">
                      <div className="meta-title"><span className="post-date">12 Sep, 2024</span></div>
                      <h5><Link href="/blog-single-with-sidebar/1">Meant widow equal an share least part.</Link></h5>
                    </div>
                  </li>
                  <li>
                    <div className="thumb">
                      <Link href="/blog-single-with-sidebar/2">
                        <img src="/assets/img/thumbs/5.jpg" alt="Thumb" />
                      </Link>
                    </div>
                    <div className="info">
                      <div className="meta-title"><span className="post-date">18 Jul, 2024</span></div>
                      <h5><Link href="/blog-single-with-sidebar/2">Future Plan &amp; Strategy for Construction</Link></h5>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 item">
              <div className="footer-item contact">
                <h4 className="widget-title">Contact Info</h4>
                <ul>
                  <li>
                    <div className="icon"><i className="fas fa-home" /></div>
                    <div className="content"><strong>Address:</strong> 5919 Trussville Crossings Pkwy, Birmingham</div>
                  </li>
                  <li>
                    <div className="icon"><i className="fas fa-envelope" /></div>
                    <div className="content"><strong>Email:</strong> <a href="mailto:info@validtheme.com">info@validtheme.com</a></div>
                  </li>
                  <li>
                    <div className="icon"><i className="fas fa-phone" /></div>
                    <div className="content"><strong>Phone:</strong> <a href="tel:2151234567">+123 34598768</a></div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="row">
            <div className="col-lg-6">
              <p>&copy; Copyright {new Date().getFullYear()}. All Rights Reserved by{" "}
                <a href="https://themeforest.net/user/validthemes" target="_blank" rel="noopener noreferrer">validthemes</a>
              </p>
            </div>
            <div className="col-lg-6 text-end">
              <ul>
                <li><Link href="/about-us">Terms</Link></li>
                <li><Link href="/about-us">Privacy</Link></li>
                <li><Link href="/contact-us">Support</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="shape-right-bottom"><img src="/assets/img/shape/10.png" alt="shape" /></div>
      <div className="shape-left-bottom"><img src="/assets/img/shape/11.png" alt="shape" /></div>
    </footer>
  );
};

export default Footer;
