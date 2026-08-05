"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

export function VantaBirds() {
  const containerRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<{ destroy: () => void } | null>(null);
  const [threeReady, setThreeReady] = useState(false);
  const [vantaReady, setVantaReady] = useState(false);

  useEffect(() => {
    if (!vantaReady || !containerRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const VANTA = (window as unknown as Record<string, any>).VANTA;
    if (!VANTA?.BIRDS) return;

    effectRef.current = VANTA.BIRDS({
      el: containerRef.current,
      backgroundAlpha: 0,
      color1: 0x2B5748,
      color2: 0x618764,
      colorMode: "variance",
      quantity: 5,
      birdSize: 1.3,
      wingSpan: 30,
      speedLimit: 5,
      separation: 50,
      alignment: 20,
      cohesion: 54,
    });

    return () => {
      effectRef.current?.destroy();
      effectRef.current = null;
    };
  }, [vantaReady]);

  return (
    <>
      {/* Load three.js first, then vanta only after three is ready */}
      <Script
        src="/js/three.min.js"
        strategy="afterInteractive"
        onReady={() => setThreeReady(true)}
      />
      {threeReady && (
        <Script
          src="/js/vanta.birds.min.js"
          strategy="afterInteractive"
          onReady={() => setVantaReady(true)}
        />
      )}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
    </>
  );
}
