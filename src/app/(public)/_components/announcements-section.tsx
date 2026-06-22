"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { type PublicAnnouncement, siteContentApi } from "@/lib/api/site-content";

function formatDate(date: string | null): string {
  if (!date) return "Recently";
  return new Date(date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export function AnnouncementsSection() {
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([]);

  useEffect(() => {
    siteContentApi.getAnnouncements().then(setAnnouncements).catch(() => {});
  }, []);

  const displayed = announcements.slice(0, 3);

  if (displayed.length === 0) return null;

  return (
    <div id="news" className="blog-area home-blog blog-grid default-padding bottom-less">
      <div className="container">
        <div className="row">
          <div className="col-lg-8 offset-lg-2">
            <div className="site-heading text-center">
              <h5 className="sub-title">Latest Updates</h5>
              <h2 className="title">News & Announcements</h2>
              <div className="devider" />
            </div>
          </div>
        </div>

        <div className="row">
          {/* Featured first item */}
          {displayed[0] && (
            <div className="col-lg-6 col-md-12 mb-30">
              <div className="blog-style-one">
                <div className="thumb">
                  <div
                    style={{
                      background: "linear-gradient(135deg, #49a760 0%, #1f4e3d 100%)",
                      height: 220,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <i className="flaticon-plant" style={{ fontSize: 64, color: "#fff", opacity: 0.8 }} />
                  </div>
                </div>
                <div className="info">
                  <div className="tags">
                    <Link href="#">{displayed[0].category === "announcement" ? "Announcement" : "News"}</Link>
                  </div>
                  <h4>
                    <Link href="#">{displayed[0].title}</Link>
                  </h4>
                  <ul className="meta">
                    <li>
                      <i className="fas fa-calendar-alt" /> {formatDate(displayed[0].published_date)}
                    </li>
                  </ul>
                  <p className="line-clamp-3">{displayed[0].body}</p>
                </div>
              </div>
            </div>
          )}

          {/* Remaining items */}
          <div className="col-lg-6 col-md-12">
            {displayed.slice(1).map((item) => (
              <div key={item.id} className="col-lg-12 col-md-12 mb-30">
                <div className="blog-style-one">
                  <div className="info" style={{ paddingTop: 8 }}>
                    <div className="tags">
                      <Link href="#">{item.category === "announcement" ? "Announcement" : "News"}</Link>
                    </div>
                    <h4>
                      <Link href="#">{item.title}</Link>
                    </h4>
                    <ul className="meta">
                      <li>
                        <i className="fas fa-calendar-alt" /> {formatDate(item.published_date)}
                      </li>
                    </ul>
                    <p className="line-clamp-2">{item.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
