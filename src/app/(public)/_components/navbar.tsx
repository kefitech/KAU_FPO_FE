"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import Image from "next/image";

export function Navbar() {
  const [sticked, setSticked] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setSticked(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "About", href: "#about" },
    { label: "Services", href: "#services" },
    { label: "Schemes", href: "#schemes" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <>
      {/* Top Bar */}
      <div className="top-bar-area text-light">
        <div className="container">
          <div className="row align-center">
            <div className="col-lg-9">
              <div className="flex-item left">
                <p>AI-Based Digital Platform for KAU-FPO Linkage Programme</p>
                <ul>
                  <li>
                    <i className="fas fa-map-marker-alt" /> Thrissur, Kerala – 680656
                  </li>
                  <li>
                    <i className="fas fa-phone-alt" /> +91 487 243 8011
                  </li>
                </ul>
              </div>
            </div>
            <div className="col-lg-3 text-end">
              <div className="social">
                <ul>
                  <li>
                    <a href="#"><i className="fab fa-facebook-f" /></a>
                  </li>
                  <li>
                    <a href="#"><i className="fab fa-twitter" /></a>
                  </li>
                  <li>
                    <a href="#"><i className="fab fa-youtube" /></a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <header>
        <nav
          className={`navbar mobile-sidenav inc-shape navbar-common navbar-sticky navbar-default validnavs ${sticked ? "sticked" : ""}`}
        >
          <div className="container d-flex justify-content-between align-items-center">
            {/* Brand */}
            <div className="navbar-header">
              <button
                type="button"
                className="navbar-toggle"
                onClick={() => setMenuOpen(true)}
              >
                <i className="fa fa-bars" />
              </button>
              <Link className="navbar-brand" href="/">
                <Image
                  src="/images/agrul/logo-green.png"
                  alt="KAU-FPO Platform"
                  width={140}
                  height={48}
                  className="logo"
                />
              </Link>
            </div>

            {/* Nav Content */}
            <div className="main-nav-content">
              <div
                className={`collapse navbar-collapse ${menuOpen ? "show collapse-mobile" : "collapse-mobile"}`}
              >
                <Image
                  src="/images/agrul/logo-green.png"
                  alt="KAU-FPO Platform"
                  width={140}
                  height={48}
                />
                <button
                  type="button"
                  className="navbar-toggle"
                  onClick={() => setMenuOpen(false)}
                >
                  <i className="fa fa-times" />
                </button>

                <ul className="nav navbar-nav navbar-right">
                  {navLinks.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} onClick={() => setMenuOpen(false)}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right side CTA */}
              <div className="attr-right">
                <div className="attr-nav">
                  <ul>
                    <li className="button">
                      <Link className="btn btn-theme btn-sm radius" href="/v1/login">
                        Login
                      </Link>
                    </li>
                    <li className="button ml-2">
                      <Link className="btn btn-theme-outline btn-sm radius" href="/register">
                        Register FPO
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>

              {menuOpen && (
                <div
                  className="overlay-screen"
                  onClick={() => setMenuOpen(false)}
                  style={{ display: "block" }}
                />
              )}
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}
