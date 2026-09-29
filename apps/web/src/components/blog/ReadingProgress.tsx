"use client";

import { useEffect, useRef } from "react";

/** G-01 — نوار ۳px پیشرفت مطالعه زیر هدر (BlogPost.dc.html)؛ بدون setState به‌ازای اسکرول. */
export function ReadingProgress({
  targetId,
  label,
}: {
  targetId: string;
  label: string;
}) {
  const barRef = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const target = document.getElementById(targetId);
    const bar = barRef.current;
    if (!target || !bar) return;
    let raf: number | null = null;
    const update = () => {
      raf = null;
      const r = target.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span <= 0 ? 1 : Math.max(0, Math.min(1, -r.top / span));
      bar.style.transform = `scaleX(${p})`;
      bar.parentElement?.setAttribute(
        "aria-valuenow",
        String(Math.round(p * 100)),
      );
    };
    const onScroll = () => {
      if (raf == null) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [targetId]);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      className="bg-border sticky top-[72px] z-20 h-[3px]"
    >
      <span
        ref={barRef}
        className="block h-full origin-right bg-gradient-to-l from-brand to-accent"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
