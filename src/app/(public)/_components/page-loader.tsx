"use client";
import { useEffect, useRef, useState } from "react";

// Persists across soft navigation; resets on hard reload
let hasStarted = false;

const PageLoader = () => {
  const barRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(!hasStarted);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    console.log("PageLoader effect firing, hasStarted =", hasStarted);
    if (hasStarted) return;
    hasStarted = false; // was true

    let pct = 0;
    const tick = setInterval(() => {
      const bar = barRef.current;
      if (!bar) return;
      pct = Math.min(pct + Math.random() * 8, 92);
      bar.style.width = pct + "%";
      if (pct >= 92) clearInterval(tick);
    }, 120);

    setTimeout(() => {
      clearInterval(tick);
      const bar = barRef.current;
      if (bar) {
        bar.style.transition = "width 0.3s ease";
        bar.style.width = "100%";
      }
      setFading(true);
      setTimeout(() => setShow(false), 600);
    }, 1800);
  }, []);

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0a1a0a",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.5s ease",
      }}
    >
      <img
        src="/assets/img/shape/19.png"
        alt="Agrul"
        style={{
          width: "clamp(200px, 30vw, 340px)",
          height: "auto",
          filter: "drop-shadow(0 0 18px rgba(76,175,80,0.6))",
          marginBottom: "40px",
        }}
      />

      <div
        style={{
          width: "clamp(200px, 30vw, 340px)",
          height: "3px",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "2px",
          overflow: "hidden",
          marginBottom: "16px",
        }}
      >
        <div
          ref={barRef}
          style={{
            height: "100%",
            width: "0%",
            background: "linear-gradient(90deg, #4caf50, #76ff03)",
            borderRadius: "2px",
            transition: "width 0.15s ease",
            boxShadow: "0 0 8px rgba(118,255,3,0.6)",
          }}
        />
      </div>

      <p
        style={{
          margin: 0,
          fontFamily: "'Poppins', sans-serif",
          fontSize: "12px",
          fontWeight: 500,
          letterSpacing: "4px",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)",
        }}
      >
        Loading
      </p>
    </div>
  );
};

export default PageLoader;
