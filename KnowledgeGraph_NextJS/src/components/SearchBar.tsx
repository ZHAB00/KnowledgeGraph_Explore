"use client";

import { useState, useCallback } from "react";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState(0);

  const doFilter = useCallback((val: string) => {
    setQuery(val);
    const svg = document.getElementById("graph-svg") as any;
    if (!svg) return;

    const lower = val.toLowerCase().trim();
    const groups = svg.querySelectorAll("g > g") as NodeListOf<HTMLElement>;

    // Remove previous highlight rings
    svg.querySelectorAll(".search-ring").forEach((r: any) => r.remove());
    setFound(0);

    if (!lower) {
      groups.forEach((g: any) => { g.style.opacity = "1"; });
      return;
    }

    let first: HTMLElement | null = null;
    const matchedIds: string[] = [];
    groups.forEach((g: any) => {
      const t = g.querySelector("text");
      if ((t?.textContent || "").toLowerCase().includes(lower)) {
        matchedIds.push(g.getAttribute("data-id") || "");
        if (!first) first = g;
      }
    });
    setFound(matchedIds.length);
    if (!matchedIds.length) return;

    const idSet = new Set(matchedIds);
    groups.forEach((g: any) => {
      const id = g.getAttribute("data-id") || "";
      if (!idSet.has(id)) return;
      const circle = g.querySelector("circle");
      if (!circle) return;
      const r = parseFloat(circle.getAttribute("r") || "8");
      const ns = "http://www.w3.org/2000/svg";
      const ring = document.createElementNS(ns, "circle");
      ring.setAttribute("class", "search-ring");
      ring.setAttribute("cx", "0");
      ring.setAttribute("cy", "0");
      ring.setAttribute("r", String(r + 6));
      ring.setAttribute("fill", "none");
      ring.setAttribute("stroke", "#2563eb");
      ring.setAttribute("stroke-width", "2.5");
      ring.setAttribute("opacity", "0.8");
      ring.innerHTML = '<animate attributeName="r" values="' + (r+4) + ';' + (r+10) + ';' + (r+4) + '" dur="1.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.2s" repeatCount="indefinite"/>';
      g.insertBefore(ring, g.firstChild);
    });

    if (first) {
      const tr = (first as any).getAttribute("transform") || "";
      const m = tr.match(/translate\(([\d.]+),\s*([\d.]+)\)/);
      if (m) (window as any).__graphZoom?.centerOn(+m[1], +m[2]);
    }
  }, []);

  return (
    <div className="relative pb-1">
      <input type="text" value={query}
        onChange={e => doFilter(e.target.value)}
        placeholder="搜索节点..."
        className="w-full rounded border border-border bg-bg py-2 pl-7 pr-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none" />
      <span className="absolute left-2.5 top-2 text-sm text-muted pointer-events-none">⌕</span>
      {query && (
        <p className="text-[10px] mt-0.5">
          {found > 0
            ? <span className="text-green-600">匹配 {found} 个</span>
            : <span className="text-red-400">未找到</span>}
        </p>
      )}
    </div>
  );
}
