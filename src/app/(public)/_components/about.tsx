
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
}
interface DangerouslySetInnerHTML {
  __html: string | TrustedHTML;
}


export default function About() {
  const [data, setData] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const locale = useLocaleStore((s) => s.locale)

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
        <div className="container p-5">
          <div
            className="banner-thumb bg-cover shadow dark"
            style={{
              background: 'url(/assets/img/about/3.jpeg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              aspectRatio: '16 / 5', // match this to your actual image's ratio
            }}
          >
            <div className="banner-style-one">
              <h2 style={{ textAlign: "center", padding: 25, fontSize: "clamp(1.75rem, 5vw, 4rem)" }}>
                <strong>{data.hero_headline?.split(" ").slice(0, 2).join(" ")}</strong>{" "}
                <span style={{ color: "var(--white)" }}>
                  {data.hero_headline?.split(" ").slice(2).join(" ")}
                </span>
              </h2>
            </div>
          </div>
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
                  className="justify-text"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.about_body) }}
                />
              </div>
            </div>
          </div>
        
          </div>
            <div className="row align-center">
              <div className="col-xl-7 col-md-6 col-lg-6 col-sm-7">
                <h3>The Mission</h3>
                <p style={{textAlign: "justify"}}>
                  The KAU-FPO Linkage (KFL) project will work with a mission to ignite a sustainable
                  agricultural development in Kerala by empowering FPOs as the driving force. This will be
                  achieved through a transformative partnership between Kerala Agricultural University
                  (KAU) and FPOs, synergizing academic brilliance with practical experience. The core
                  mission encompasses the following:
                </p>
                  <ul className="check-solid-list mt-20">
                    <li style={{textAlign: "justify"}}>
                      Empowerment of FPOs for excellence: Empowering FPO members through
                      knowledge and entrepreneurial skill development, equipping them to conquer the
                      challenges of modern agriculture and propel their organizations towards self-
                      sufficiency
                    </li>
                    <li style={{textAlign: "justify"}}>Research for impact: Fueling groundbreaking business and policy-oriented research
                      directly addressing the critical issues faced by FPOs. This research will be a
                      cornerstone for providing actionable solutions for their growth and propelling
                      informed decision-making
                    </li>
                    <li style={{textAlign: "justify"}}>Building sustainable FPO ecosystems: Foster a collaborative environment and
                        provide handholding support to streamline FPO activities, ensuring their long-term
                        sustainability and maximising their impact on Kerala’s agriculture.
                    </li>
                  </ul>
                

              </div>


              <div className="col-xl-3 col-lg-4 col-md-5 col-md-3 ">
                <div className="vision-circle" >
                  <div>
                <h2 className="banner-style-one" ><strong style={{ color: "var(--color-secondary)" }}>The Vision</strong></h2>
                
                <p style={{textAlign: "justify"}}>The KAU-FPO Linkage (KFL) project envisions a future where FPOs in Kerala flourish as
                  empowered and self-sustaining institutions driven by strategic collaboration between the
                  academic expertise of Kerala Agricultural University and the invaluable real-world
                  experience of FPO members.</p>
              </div>
              </div>
              </div>
              </div>
              </div>
          </div>
          
         
         
     
  );
}
 