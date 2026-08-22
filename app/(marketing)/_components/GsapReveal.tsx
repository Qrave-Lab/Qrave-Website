"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

type GsapRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "fade";
  duration?: number;
};

const GsapReveal = ({
  children,
  className = "",
  delay = 0,
  direction = "up",
  duration = 0.85,
}: GsapRevealProps) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    let x = 0;
    let y = 0;

    if (direction === "up") y = 32;
    if (direction === "down") y = -32;
    if (direction === "left") x = 40;
    if (direction === "right") x = -40;

    // Set initial GSAP state
    gsap.set(el, { opacity: 0, x, y });

    // IntersectionObserver for smooth entrance trigger
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.to(el, {
              opacity: 1,
              x: 0,
              y: 0,
              duration,
              delay,
              ease: "power3.out",
              overwrite: "auto"
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "80px 0px" }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [delay, direction, duration]);

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  );
};

export default GsapReveal;
