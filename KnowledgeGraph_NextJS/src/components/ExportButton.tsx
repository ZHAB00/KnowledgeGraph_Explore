"use client";

import { exportAsPNG, exportAsSVG } from "@/lib/graph-layout";

export default function ExportButton({ format }: { format: "png" | "svg" }) {
  function handleClick() {
    const cy = (window as any).__cy;
    if (!cy) return;
    if (format === "svg") exportAsSVG(cy);
    else exportAsPNG(cy);
  }

  return (
    <button onClick={handleClick}
      className="rounded border border-border px-2 py-1 text-xs text-muted hover:bg-bg hover:text-text transition-colors">
      {format === "png" ? "导出 PNG" : "导出 PNG (SVG)"}
    </button>
  );
}
