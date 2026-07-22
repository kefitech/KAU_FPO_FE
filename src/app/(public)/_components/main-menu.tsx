"use client";
import Link from "next/link";

interface Props {
  openIndex?: number | null;
  toggleSubMenu?: (index: number) => (e: React.MouseEvent<HTMLAnchorElement>) => void;
  navbarPlacement?: string;
}

const MainMenu = ({ openIndex, toggleSubMenu, navbarPlacement }: Props) => {
  return (
    <ul className={`nav navbar-nav ${navbarPlacement} navbar-right`} data-in="fadeInDown" data-out="fadeOutUp">
      <li className={`dropdown ${openIndex === 0 ? "on" : ""}`}>
        <Link href="#" className="dropdown-toggle" data-toggle="dropdown" onClick={toggleSubMenu?.(0)}>Get Started</Link>
        <ul className="dropdown-menu">
          <li><a href="/v1/login">Sign In</a></li>
          <li><a href="/register">Register</a></li>
        </ul>
      </li>
      <li className={`dropdown ${openIndex === 1 ? "on" : ""}`}>
        <Link href="#" className="dropdown-toggle" data-toggle="dropdown" onClick={toggleSubMenu?.(1)}>Pages</Link>
        <ul className="dropdown-menu">
          <li><Link href="/about-us">About Us</Link></li>
          <li><Link href="/team">Team</Link></li>
          <li><Link href="/howtoregister">How To Register</Link></li>
          <li><Link href="/news-sources">In the News</Link></li>
          <li><Link href="/faq">FAQs</Link></li>
          <li><Link href="/contact-us">Contact Us</Link></li>
        </ul>
      </li>
      <li>
        <Link href="/news-events">Events &amp; Updates</Link>
      </li>
           {/* <li className="dropdown">
        <Link href="/project" className="dropdown-toggle" data-toggle="dropdown" onClick={toggleSubMenu}>Projects</Link>
        <ul className="dropdown-menu">
          <li><Link href="/project">Project</Link></li>
          <li><Link href="/project-details/1">Project Details</Link></li>
        </ul>
      </li>
      <li className="dropdown">
        <Link href="#" className="dropdown-toggle" data-toggle="dropdown" onClick={toggleSubMenu}>Services</Link>
        <ul className="dropdown-menu">
          <li><Link href="/services">Services</Link></li>
          <li><Link href="/service-details/1">Services Details</Link></li>
        </ul>
      </li> */}
    </ul>
  );
};

export default MainMenu;
 