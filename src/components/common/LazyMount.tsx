"use client";

import React, { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mounts children only after the sentinel enters (or nears) the viewport.
 * Used to defer below-the-fold dashboard widgets so the first paint stays light.
 */
export default function LazyMount({
  children,
  rootMargin = "200px 0px",
  fallback = null,
}: {
  children: ReactNode;
  rootMargin?: string;
  fallback?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { root: null, rootMargin, threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  return <div ref={ref}>{visible ? children : fallback}</div>;
}
