"use client";
import { useEffect, useRef } from "react";

const SIZE = 46;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const ScrollToTop = () => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const progressRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const button = buttonRef.current;
    const circle = progressRef.current;
    if (!button || !circle) return;

    const update = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const pct = total > 0 ? scrolled / total : 0;
      circle.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - pct));
      if (scrolled > 200) {
        button.style.opacity = "1";
        button.style.transform = "translateY(0)";
        button.style.pointerEvents = "auto";
      } else {
        button.style.opacity = "0";
        button.style.transform = "translateY(20px)";
        button.style.pointerEvents = "none";
      }
    };

    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <button
      ref={buttonRef}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      style={{
        position: "fixed", bottom: "30px", right: "30px",
        width: `${SIZE}px`, height: `${SIZE}px`,
        background: "#4caf50", border: "none", borderRadius: "50%",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)", opacity: 0,
        transform: "translateY(20px)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        pointerEvents: "none", padding: 0, zIndex: 9999,
      }}
    >
      <svg width={SIZE} height={SIZE} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={STROKE} />
        <circle ref={progressRef} cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#fff" strokeWidth={STROKE}
          strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE} strokeLinecap="round" />
      </svg>
      <i className="fas fa-long-arrow-up" style={{ color: "#fff", fontSize: "14px", position: "relative", zIndex: 1 }} />
    </button>
  );
};

export default ScrollToTop;
