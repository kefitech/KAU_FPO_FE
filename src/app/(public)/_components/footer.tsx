import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-dark">
      <div className="container">
        <div className="f-items default-padding">
          <div className="row">
            {/* Brand */}
            <div className="col-lg-4 col-md-6 item">
              <div className="f-item about">
                <Image
                  src="/images/agrul/logo-light.png"
                  alt="KAU-FPO Platform"
                  width={160}
                  height={55}
                  className="logo"
                />
                <p className="mt-20">
                  AI-Based Digital Platform for KAU-FPO Linkage Programme. Developed by KefiTech in
                  partnership with Kerala Agricultural University.
                </p>
                <div className="social mt-30">
                  <ul>
                    <li><a href="#"><i className="fab fa-facebook-f" /></a></li>
                    <li><a href="#"><i className="fab fa-twitter" /></a></li>
                    <li><a href="#"><i className="fab fa-youtube" /></a></li>
                    <li><a href="#"><i className="fab fa-instagram" /></a></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="col-lg-2 col-md-6 item">
              <div className="f-item link">
                <h4 className="widget-title">Quick Links</h4>
                <ul>
                  <li><Link href="/">Home</Link></li>
                  <li><Link href="#about">About</Link></li>
                  <li><Link href="#services">Services</Link></li>
                  <li><Link href="#portals">Portals</Link></li>
                  <li><Link href="#contact">Contact</Link></li>
                </ul>
              </div>
            </div>

            {/* Portals */}
            <div className="col-lg-2 col-md-6 item">
              <div className="f-item link">
                <h4 className="widget-title">Portals</h4>
                <ul>
                  <li><Link href="/fpo/dashboard">FPO Portal</Link></li>
                  <li><Link href="/admin/dashboard">Admin Portal</Link></li>
                  <li><Link href="/government/dashboard">Government</Link></li>
                  <li><Link href="/cbbo/dashboard">CBBO Portal</Link></li>
                </ul>
              </div>
            </div>

            {/* Account */}
            <div className="col-lg-4 col-md-6 item">
              <div className="f-item newsletter">
                <h4 className="widget-title">Get Started</h4>
                <p>
                  Join the KAU-FPO platform today and empower your Farmer Producer Organization
                  with digital tools.
                </p>
                <div className="mt-20">
                  <Link className="btn btn-theme btn-md radius" href="/register">
                    Register Your FPO
                  </Link>
                </div>
                <div className="mt-15">
                  <Link className="btn btn-light btn-md radius" href="/v1/login">
                    Login to Dashboard
                  </Link>
                </div>
                <div className="built-by mt-30 p-15" style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8 }}>
                  <small style={{ color: "#aaa" }}>Developed by</small>
                  <p className="mb-0" style={{ color: "#fff", fontWeight: 700 }}>KefiTech</p>
                  <small style={{ color: "#aaa" }}>in partnership with KAU</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <div className="container">
          <div className="row">
            <div className="col-lg-6">
              <p>
                © {new Date().getFullYear()} Kerala Agricultural University. All rights reserved.
              </p>
            </div>
            <div className="col-lg-6 text-end">
              <ul>
                <li><Link href="#">Privacy Policy</Link></li>
                <li><Link href="#">Terms of Use</Link></li>
                <li><Link href="#">Support</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
