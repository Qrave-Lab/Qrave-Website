"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  durationMs?: number;
  yOffset?: number;
  once?: boolean;
};

const ScrollReveal = ({
  children,
  className,
  delayMs = 0,
  durationMs = 700,
  yOffset = 28,
  once = true,
}: ScrollRevealProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Safety fallback: Ensure content becomes visible even if observer fails or threshold isn't hit
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 250);

    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setIsVisible(false);
          }
        });
      },
      {
        threshold: 0.01,
        rootMargin: "100px 0px 100px 0px",
      }
    );

    observer.observe(node);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [once]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translate3d(0,0,0)" : `translate3d(0,${yOffset}px,0)`,
        transition: `opacity ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        transitionDelay: `${delayMs}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
};

export default ScrollReveal;