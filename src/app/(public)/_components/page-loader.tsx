"use client";
import { useEffect, useRef, useState } from "react";

// Persists across soft navigation; resets on hard reload
let hasStarted = false;

const PageLoader = () => {
  const barRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(!hasStarted);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (hasStarted) return;
    hasStarted = false;

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
        background: "#0a1a0a", // Keep your original background
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.5s ease",
      }}
    >
      <div className="loader">
        <div className="inner one" />
        <div className="inner two" />
        <div className="inner three" />
        <div className="loaderlogo">
          <img src="/assets/img/shape/19.png" alt="Agrul" />
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
