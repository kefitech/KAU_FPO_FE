"use client";
import Link from "next/link";

interface Props {
  toggleSubMenu?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  navbarPlacement?: string;
}

const MainMenu = ({ toggleSubMenu, navbarPlacement }: Props) => {
  return (
    <ul className={`nav navbar-nav ${navbarPlacement} navbar-right`} data-in="fadeInDown" data-out="fadeOutUp">
      <li className="dropdown">
        <Link href="#" className="dropdown-toggle" data-toggle="dropdown" onClick={toggleSubMenu}>Home</Link>
        <ul className="dropdown-menu">
          <li><Link href="/">Agriculture</Link></li>
        </ul>
      </li>
      <li className="dropdown">
        <Link href="#" className="dropdown-toggle" data-toggle="dropdown" onClick={toggleSubMenu}>Pages</Link>
        <ul className="dropdown-menu">
          <li><Link href="/about-us">About Us</Link></li>
          <li><Link href="/team">Team</Link></li>
          <li><Link href="/howtoregister">How To Register</Link></li>
          <li><Link href="/news-sources">In the News</Link></li>
          <li><Link href="/faq">Faq</Link></li>
          <li><Link href="/contact-us">Contact Us</Link></li>
        </ul>
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
      <li>
        <Link href="/news-events">News &amp; Events</Link>
      </li>
      </ul>
        
  );
};

export default MainMenu;
