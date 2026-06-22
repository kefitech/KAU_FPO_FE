"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const FACTS = [
  { id: 1, end: 250, unit: "+", title: "Registered FPOs" },
  { id: 2, end: 14, unit: "", title: "Kerala Districts Covered" },
  { id: 3, end: 98, unit: "%", title: "Member Satisfaction" },
  { id: 4, end: 500, unit: "K+", title: "Farmers Connected" },
];

function Counter({ end, unit }: { end: number; unit: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 2000;
          const step = Math.ceil(end / (duration / 16));
          let current = 0;
          const timer = setInterval(() => {
            current = Math.min(current + step, end);
            setCount(current);
            if (current >= end) clearInterval(timer);
          }, 16);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [end]);

  return (
    <span ref={ref} className="timer">
      {count}
      {unit}
    </span>
  );
}

export function Stats() {
  return (
    <div className="fun-facts-area default-padding">
      <div className="shape-left">
        <Image src="/images/agrul/shape/27.png" alt="shape" width={120} height={120} />
      </div>

      <div className="container">
        <div className="item-inner">
          <div className="shape-right">
            <Image src="/images/agrul/shape/26.png" alt="shape" width={200} height={200} />
          </div>
          <div className="row">
            <div className="col-lg-4 fun-fact-style-one">
              <div className="heading">
                <div className="sub-title">Our Achievements</div>
                <h2 className="title">
                  Delivering Value <br /> Since 2020
                </h2>
              </div>
            </div>
            <div className="col-lg-8 fun-fact-style-one text-end">
              <div className="row">
                {FACTS.map((fact) => (
                  <div key={fact.id} className="col-lg-4 col-md-4 item">
                    <div className="fun-fact-style-one-item">
                      <div className="counter">
                        <Counter end={fact.end} unit={fact.unit} />
                      </div>
                      <span className="medium">{fact.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
