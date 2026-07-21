"use client";

import { useEffect } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import useSidebarMenu from "../_hooks/useSidebarMenu";
import useStickyMenu from "../_hooks/useStickyMenu";
import useSubMenuToggle from "../_hooks/useSubMenuToggle";
import HeaderTop, { LangToggle } from "./header-top";
import MainMenu from "./main-menu";

const Header = () => {
  const { openIndex, toggleSubMenu } = useSubMenuToggle();
  const { isOpen, openMenu, closeMenu } = useSidebarMenu();
  const isMenuSticky = useStickyMenu();
  const pathname = usePathname();
  // biome-ignore lint/correctness/useExhaustiveDependencies: only re-run on route change, closeMenu identity intentionally excluded
  useEffect(() => {
    closeMenu();
  }, [pathname]);

  return (
    <>
      <HeaderTop />
      <header>
        <nav
          className={`navbar mobile-sidenav inc-shape navbar-common navbar-sticky navbar-default validnavs ${isMenuSticky ? "sticked" : ""}`}
        >
          <div className="container d-flex align-items-center gap-3 navbar-container-fix">
            <div className="navbar-header">
              <button type="button" className="navbar-toggle" onClick={openMenu}>
                <i className="fa fa-bars" />
              </button>

              <Link className="navbar-brand" href="/">
                <div className="navbar-logos">
                  <img src="/assets/img/logo.png" className="logo" alt="Logo" />
                  <img src="/assets/img/SHM_MIDH.png" className="logo logo-secondary" alt="SHM MIDH Logo" />
                </div>
              </Link>
            </div>

            <div className="main-nav-content">
              <div
                id="navbar-menu"
                className={`collapse navbar-collapse ${isOpen ? "show collapse-mobile" : "collapse-mobile"}`}
              >
                <div className="mobile-menu-top-row">
                  <img src="/assets/img/logo.png" alt="Logo" />
                  <div className="mobile-menu-top-right">
                    <div className="d-lg-none">
                      <LangToggle variant="dark" />
                    </div>
                    <button type="button" className="navbar-toggle" onClick={closeMenu}>
                      <i className="fa fa-times" />
                    </button>
                  </div>
                </div>
                <MainMenu navbarPlacement="navbar-right" openIndex={openIndex} toggleSubMenu={toggleSubMenu} />
                <div className="sidebar-info">
                  <ul>
                    <li>
                      <i className="fas fa-map-marker-alt" /> Kerala Agriculture University, Mannuthy
                    </li>
                    <li>
                      <i className="fas fa-phone-alt" /> +4733378901
                    </li>
                  </ul>
                  <div className="sidebar-social">
                    <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-facebook-f" />
                    </a>
                    <a href="https://www.x.com/" target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-twitter" />
                    </a>
                    <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-youtube" />
                    </a>
                    <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer">
                      <i className="fab fa-linkedin-in" />
                    </a>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className={`overlay-screen ${isOpen ? "opened" : ""}`}
                onClick={closeMenu}
                tabIndex={isOpen ? 0 : -1}
                aria-label="Close menu"
                onKeyDown={(e) => e.key === "Escape" && closeMenu()}
                style={{
                  border: "none",
                  background: "none",
                  padding: 0,
                  margin: 0,
                  cursor: "pointer",
                  display: "block",
                }}
              />
            </div>
          </div>
        </nav>
      </header>
    </>
  );
};

export default Header;
