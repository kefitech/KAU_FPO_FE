"use client";

import { useEffect, useRef } from "react";
import type { VantaEffect } from "vanta/dist/vanta.birds.min";

export function VantaBirds() {
  const containerRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<VantaEffect | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const THREE = await import("three");
      // Vanta reads THREE from window — set before calling init
      (window as Window & { THREE?: typeof THREE }).THREE = THREE;

      const { default: VantaBirds } = await import("vanta/dist/vanta.birds.min");

      if (!mounted || !containerRef.current) return;

      effectRef.current = VantaBirds({
        el: containerRef.current,
        THREE,
        backgroundColor: 0x07192f,
        backgroundAlpha: 1,
        color1: 0xff0000,
        color2: 0xd1ff,
        colorMode: "varianceGradient",
        quantity: 5,
        birdSize: 1,
        wingSpan: 30,
        speedLimit: 5,
        separation: 20,
        alignment: 20,
        cohesion: 54,
      });
    }

    init();

    return () => {
      mounted = false;
      effectRef.current?.destroy();
      effectRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
}
