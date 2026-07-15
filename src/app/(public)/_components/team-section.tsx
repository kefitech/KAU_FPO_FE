"use client";

import { useEffect, useState, useRef } from "react";

import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import { useLocaleStore } from "@/stores/locale-store";

import { publicFetch } from "../_lib/public-fetch";

interface TeamMember {
  id: number;
  name: string;
  designation: string | null;
  photo_url: string | null;
  order: number;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function MemberCard({ member }: { member: TeamMember }) {
  return (
    <div className="farmer-style-one-item">
      <div
        className="thumb"
        style={{
          width: 200,
          height: 200,
          overflow: "hidden",
          borderRadius: "50%",
          flexShrink: 0,
          margin: "0 auto",
        }}
      >
        {member.photo_url ? (
          // biome-ignore lint/performance/noImgElement: using next/image later
          <img
            src={member.photo_url}
            alt={member.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top",
              borderRadius: "50%",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "var(--color-primary)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
              fontWeight: 700,
              color: "#fff",
              fontFamily: "var(--font-default)",
            }}
          >
            {getInitials(member.name)}
          </div>
        )}
      </div>
      <div
        className="info"
        style={{
          float: "none",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          paddingTop: 16,
          width: "100%",
        }}
      >
        <h3 style={{ textAlign: "center", margin: 0, fontWeight: 700 }}>{member.name}</h3>
        {member.designation && (
          <span style={{ display: "block", textAlign: "center", width: "100%" }}>
            {member.designation}
          </span>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="farmer-style-one-item">
      <div
        className="thumb"
        style={{ background: "#f0f0f0", aspectRatio: "1", animation: "pulse 1.5s ease-in-out infinite" }}
      />
      <div className="info" style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            height: 12,
            width: "60%",
            background: "#f0f0f0",
            borderRadius: 4,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            height: 16,
            width: "80%",
            background: "#f0f0f0",
            borderRadius: 4,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
    </div>
  );
}

interface Props {
  showAll?: boolean;
}

const TeamSection = ({ showAll = false }: Props) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const locale = useLocaleStore((s) => s.locale);

  // Use STATE (not refs) so Swiper re-renders once these are set
  const [prevEl, setPrevEl] = useState<HTMLDivElement | null>(null);
  const [nextEl, setNextEl] = useState<HTMLDivElement | null>(null);
  const [paginationEl, setPaginationEl] = useState<HTMLDivElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: locale intentionally triggers a refetch
  useEffect(() => {
    publicFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/public/team/`)
      .then((r) => r.json())
      .then((json) => setMembers((json.data as TeamMember[]) ?? []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, [locale]);

  // Team page — show all in a responsive grid
  if (showAll) {
    return (
      <div className="farmer-area default-padding bottom-less">
        <div className="container">
          <div className="farmer-style-one">
            <h2 className="heading">Our Team</h2>
          </div>
          <div className="row">
            <div className="col-lg-10 offset-lg-1">
              <div className="row">
                {loading ? (
                  [0, 1, 2, 3, 4, 5].map((i) => (
                    <div className="col-lg-4 col-md-6 farmer-stye-one" style={{ marginBottom: 30 }} key={i}>
                      <SkeletonCard />
                    </div>
                  ))
                ) : members.length === 0 ? (
                  <div className="col-12 text-center" style={{ padding: "48px 0", color: "#888" }}>
                    No team members available.
                  </div>
                ) : (
                  members.map((member) => (
                    <div className="col-lg-4 col-md-6 farmer-stye-one" style={{ marginBottom: 30 }} key={member.id}>
                      <MemberCard member={member} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Home page — carousel (3 per row on desktop, arrows + dots)
  if (!loading && members.length === 0) return null;

  return (
    <div
      className="farmer-area default-padding bottom-less bg-gray"
      style={{ backgroundImage: "url(/assets/img/shape/36.png)" }}
    >
      <div className="container">
        <div className="row">
          <div className="col-lg-8 offset-lg-2">
            <div className="site-heading text-center">
              <h5 className="sub-title">Our Team</h5>
              <h2 className="title">Meet Our Leadership</h2>
              <div className="devider" />
              
            </div>
          </div>
        </div>
      </div>
      <div className="container">
        <div className="row">
          <div className="col-lg-10 offset-lg-1">
            {loading ? (
              <div className="row">
                {[0, 1, 2].map((i) => (
                  <div className="col-lg-4 col-md-6 farmer-stye-one" style={{ marginBottom: 30 }} key={i}>
                    <SkeletonCard />
                  </div>
                ))}
              </div>
            ) : (           
             <div className="navigation-circle" style={{ position: "relative" }}>
                <Swiper
                  modules={[Navigation, Pagination, Autoplay]}
                  spaceBetween={30}
                  slidesPerView={1}
                  loop={members.length > 3}
                  autoplay={{ delay: 4000, disableOnInteraction: false }}
                  navigation={{
                    prevEl,
                    nextEl,
                  }}
                  pagination={{
                    el: paginationEl,
                    clickable: true,
                  }}
                  breakpoints={{
                    768: { slidesPerView: 2 },
                    992: { slidesPerView: 3 },
                  }}
                >
                  {members.map((member) => (
                    <SwiperSlide key={member.id} className="farmer-stye-one" style={{ paddingBottom: 30 }}>
                      <MemberCard member={member} />
                    </SwiperSlide>
                  ))}
                </Swiper>
                <div ref={setPrevEl} className="team-swiper-prev swiper-button-prev" />
                <div ref={setNextEl} className="team-swiper-next swiper-button-next" />
                <div ref={setPaginationEl} className="team-swiper-pagination swiper-pagination" style={{ marginTop: 16 }} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamSection;
