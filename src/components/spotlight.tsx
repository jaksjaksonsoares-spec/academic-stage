"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Faz o refletor do palco e as camadas (.layer[data-depth]) acompanharem o
 * ponteiro. Em toque não há hover: o refletor fica parado. Respeita a
 * preferência por movimento reduzido.
 */
export function Spotlight({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(pointer: fine)");
    if (reduce.matches || !fine.matches) return;

    let frame = 0;
    const layers = Array.from(el.querySelectorAll<HTMLElement>(".layer[data-depth]"));

    function onMove(e: PointerEvent) {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el!.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el!.style.setProperty("--spot-x", `${(x * 100).toFixed(1)}%`);
        el!.style.setProperty("--spot-y", `${(y * 100).toFixed(1)}%`);
        for (const layer of layers) {
          const d = Number(layer.dataset.depth) || 0;
          layer.style.transform = `translate3d(${((x - 0.5) * d).toFixed(1)}px, ${((y - 0.5) * d).toFixed(1)}px, 0)`;
        }
      });
    }

    el.addEventListener("pointermove", onMove);
    return () => {
      el.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className={`stage ${className}`}>
      <div className="stage-floor" aria-hidden="true" />
      {children}
    </div>
  );
}
