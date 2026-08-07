
"use client";

import { useEffect, useState, FormEvent } from "react";
import { publicFetch } from "../_lib/public-fetch";
import DOMPurify from "dompurify";
import { useLocaleStore } from "@/stores";

interface AboutData {
  about_body: string;
  about_title: string;
  hero_description: string;
  hero_headline: string;
  hero_subheading: string;
  how_to_register: string;
  mission_title: string;
  mission_body: string;
  vision_title: string;
  vision_body: string;
}
interface DangerouslySetInnerHTML {
  __html: string | TrustedHTML;
}


export default function About() {
  const [data, setData] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const locale = useLocaleStore((s) => s.locale)


  function parseMissionBody(html: string): { intro: string; items: string[] } {
    if (typeof window === "undefined" || !html) return { intro: "", items: [] };
    const doc = new DOMParser().parseFromString(html, "text/html");
    const ul = doc.querySelector("ul");
    let items: string[] = [];
    if (ul) {
      items = Array.from(ul.querySelectorAll("li")).map((li) => li.innerHTML);
      ul.remove();
    }
    return { intro: doc.body.innerHTML, items };
  }

  useEffect(() => {
    if (!locale) return;
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/site-content/`)
      .then((res) => res.json())
      .then((json) => setData(json.data))
      .catch((err) => {
        console.error(err);
        setError("Unable to load page content. Please try again shortly.");
      })
      .finally(() => setLoading(false));
  }, [locale]);
  

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-background text-muted-foreground">
        {error ?? "Content is currently unavailable."}
      </div>
    );
  }

  return (

    <div className="default-padding ">
      <div className="container">
        <div className="shape-right-top">
          <img src="/assets/img/shape/leaf.png" alt="leaf shape" />
        </div>
        <div className="row align-items-center">
          <div className="col-xl-4 col-lg-5 col-3 about-style-one pr-50 pr-md-15 pr-xs-15 pt-xl-5">
            <div className="thumb">
              <img src="/assets/img/about/2.jpeg" alt="About" className="about-thumb-img max-[990px]:hidden" />
              <div className="sub-item">
                <img src="/assets/img/logoblack.png" alt="About" className="max-[990px]:hidden" />
              </div>
            </div>
          </div>

          <div className="col-xl-8 col-lg-7 about-style-one">
            <div className="row align-center">
              <div className="col-xl-12 col-lg-12">
                <h2 className="heading pt-4 text-center">{data.about_title}</h2>

              <div
                className={`justify-text ${locale === "ml" ? "justify-tight" : ""}`}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.about_body) }}
              />
              </div>
            </div>
          </div>
        
          </div>
            <div className="row align-center force-white-text" >
              <div className="col-12">
                {(() => {
                  const { intro, items } = parseMissionBody(data.mission_body);
                  return (
                    <div className="mission-vision-container">
                      <div className="mission-column">
                        <h2 className="mission-title">{data.mission_title}</h2>
                        {intro && (
                          <div
                            className={`justify-text force-white-text mission-intro ${locale === "ml" ? "justify-tight" : ""}`}
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(intro) }}
                          />
                        )}
                         <div className="mission-items">
                          {items.map((html, i) => (
                            <div key={i} className="mission-card">
                              <span className="mission-check">&#xf00c;</span>
                              <div
                                className={`justify-text force-white-text mission-card-text ${locale === "ml" ? "justify-tight" : ""}`}
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="vision-column">
                        <div className="vision-card">
                          <h2 className="vision-title">{data.vision_title}</h2>
                          <div
                            className={`justify-text force-white-text ${locale === "ml" ? "justify-tight" : ""}`}
                            style={{color: "#ffffff", opacity: 0.9 }}
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.vision_body) }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
              </div>
          </div>
         
         
     
  );
}
 