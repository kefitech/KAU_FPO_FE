import Link from "next/link";

const PORTALS = [
  {
    flaticon: "flaticon-farmer",
    title: "FPO Portal",
    badge: "For FPO Managers",
    description:
      "Manage your FPO — register members, track crops, access markets, and get AI-based recommendations.",
    href: "/fpo/dashboard",
  },
  {
    flaticon: "flaticon-settings",
    title: "Admin Portal",
    badge: "For Administrators",
    description:
      "Full system control — manage FPO registrations, approve applications, and oversee operations.",
    href: "/admin/dashboard",
  },
  {
    flaticon: "flaticon-agriculture",
    title: "Government Portal",
    badge: "For Officials",
    description:
      "Monitor FPO performance across districts, generate reports, and track programme outcomes.",
    href: "/government/dashboard",
  },
  {
    flaticon: "flaticon-plant",
    title: "CBBO Portal",
    badge: "For CBBO Coordinators",
    description:
      "Cluster-level oversight of FPO activities, capacity building, and linkage programme management.",
    href: "/cbbo/dashboard",
  },
];

export function Portals() {
  return (
    <div id="portals" className="services-style-one-area default-padding bg-gray">
      <div className="container">
        <div className="row">
          <div className="col-lg-8 offset-lg-2">
            <div className="site-heading text-center">
              <h5 className="sub-title">Access</h5>
              <h2 className="title">Portals For Every Stakeholder</h2>
              <div className="devider" />
            </div>
          </div>
        </div>

        <div className="row">
          {PORTALS.map((portal) => (
            <div key={portal.title} className="col-lg-3 col-md-6 mb-30">
              <div className="services-style-one text-center">
                <div className="icon">
                  <i className={portal.flaticon} />
                </div>
                <span className="badge badge-light">{portal.badge}</span>
                <h5 className="mt-15">
                  <Link href={portal.href}>{portal.title}</Link>
                </h5>
                <p>{portal.description}</p>
                <Link className="btn btn-theme btn-xs radius mt-20" href={portal.href}>
                  Access Portal
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
