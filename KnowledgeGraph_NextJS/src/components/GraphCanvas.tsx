"use client";

import { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import type { GraphNode, GraphEdge } from "@/lib/types";

interface Props { nodes: GraphNode[]; edges: GraphEdge[]; onNodeClick: (id: string) => void; }

interface SimNode extends d3.SimulationNodeDatum {
  id: string; label: string; type: string; degree: number; radius: number;
  x: number; y: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  label: string; source: string; target: string; weight: number;
}

const COLORS: Record<string, string> = {
  person: "#d97706", organization: "#2563eb", location: "#7c3aed",
  concept: "#059669", event: "#0891b2", technology: "#059669",
  theory: "#7c3aed", metric: "#d97706",
};
const DEFAULT_COLOR = "#64748b";

// ── Tunable force parameters ──
const FORCE = {
  linkDist: 50,       // extra distance beyond node radii
  charge: -20,       // repulsion strength (more negative = further apart)
  collidePad: 10,     // extra collision padding beyond node radius
  centerStr: 0.15,    // center attraction strength (0-1)
};

export default function GraphCanvas({ nodes, edges, onNodeClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const clickRef = useRef(onNodeClick);
  clickRef.current = onNodeClick;

  // Animated background
  useEffect(() => {
    const c = bgRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let w = c.width = c.offsetWidth, h = c.height = c.offsetHeight;
    const onR = () => { w = c.width = c.offsetWidth; h = c.height = c.offsetHeight; };
    window.addEventListener("resize", onR);
    const blobs = [
      { x: 0.25, y: 0.45, dx: 0.00008, dy: 0.0001, r: 0.3, c: [195,185,175] },
      { x: 0.75, y: 0.55, dx: -0.0001, dy: -0.00008, r: 0.28, c: [175,180,190] },
    ];
    const pts = Array.from({ length: 15 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
    }));
    let rid = 0;
    function frame() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      for (const b of blobs) {
        b.x += b.dx; b.y += b.dy;
        if (b.x > 1.1) b.dx *= -1; if (b.x < -0.1) b.dx *= -1;
        if (b.y > 1.1) b.dy *= -1; if (b.y < -0.1) b.dy *= -1;
        const g = ctx.createRadialGradient(b.x * w, b.y * h, 0, b.x * w, b.y * h, b.r * w);
        g.addColorStop(0, "rgba(" + b.c.join(",") + ",0.06)");
        g.addColorStop(0.5, "rgba(" + b.c.join(",") + ",0.02)");
        g.addColorStop(1, "transparent"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(100,116,139,0.35)"; ctx.fill();
      }
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = "rgba(148,163,184," + (0.08 * (1 - dist / 140)) + ")";
            ctx.lineWidth = 0.4; ctx.stroke();
          }
        }
      rid = requestAnimationFrame(frame);
    }
    frame();
    return () => { cancelAnimationFrame(rid); window.removeEventListener("resize", onR); };
  }, []);

  // Stable key: only changes when actual graph content changes
  const dataKey = useMemo(() =>
    nodes.map(n => n.id).sort().join(",") + "|" + edges.map(e => `${e.source}-${e.target}-${e.label}`).sort().join(","),
    [nodes, edges]
  );

  // Build simulation data
  const simData = useMemo(() => {
    const deg = new Map<string, number>();
    nodes.forEach(n => deg.set(n.id, 0));
    edges.forEach(e => { deg.set(e.source, (deg.get(e.source) || 0) + 1); deg.set(e.target, (deg.get(e.target) || 0) + 1); });
    const maxD = Math.max(1, ...deg.values());

    const simNodes: SimNode[] = nodes.map(n => {
      const d = deg.get(n.id) || 0;
      return {
        id: n.id, label: n.label.slice(0, 18), type: n.type, degree: d,
        radius: 4 + (d / maxD) * 12,
        x: Math.random() * 800, y: Math.random() * 600,
      };
    });

    const nodeMap = new Map(simNodes.map(n => [n.id, n]));
    const simLinks: SimLink[] = edges
      .filter(e => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map(e => ({
        source: e.source, target: e.target, label: e.label, weight: e.weight,
    /* @ts-ignore */
      }));

    return { simNodes, simLinks, nodeMap, maxD };
  }, [nodes, edges]);

  // D3 Force Simulation
  useEffect(() => {
    // @ts-ignore
    const svg: any = d3.select(svgRef.current!);
    const { simNodes, simLinks, nodeMap } = simData;
    if (!simNodes.length) { svg.selectAll("*").remove(); return; }

    const W = svgRef.current?.clientWidth || 800;
    const H = svgRef.current?.clientHeight || 600;

    svg.selectAll("*").remove();
    // Reset zoom to identity — otherwise previous transform offsets new graph
    svg.call((d3 as any).zoom().transform, (d3 as any).zoomIdentity);

    const g = svg.append("g");

    // Center-based zoom (not cursor-based)
    const zoom = (d3 as any).zoom()
      .scaleExtent([0.3, 3])
      .wheelDelta((e: any) => -e.deltaY * 0.002)
      .filter((e: any) => e.type === "wheel" || e.type === "mousedown")
      .on("zoom", (e: any) => {
        if (e.sourceEvent?.type === "wheel") {
          // Center-based zoom
          const s = e.transform.k;
          const tx = W / 2 * (1 - s) + e.transform.x * s / (e.transform.k / s);
          g.attr("transform", `translate(${W / 2 * (1 - s)},${H / 2 * (1 - s)}) scale(${s})`);
        } else {
          g.attr("transform", e.transform.toString());
        }
      });
    svg.call(zoom);
    // Initial zoom 50%
    svg.call((zoom as any).transform, (d3 as any).zoomIdentity.translate(W / 4, H / 4).scale(0.5));

    // Expose zoom control to sidebar
    (window as any).__graphZoom = {
      centerOn: (x: number, y: number) => {
        svg.transition().duration(400).call((zoom as any).transform, (d3 as any).zoomIdentity.translate(W / 2 - x * 1.8, H / 2 - y * 1.8).scale(1.8));
      },
      restart: () => {
        // Re-run force layout from scratch
        const spreadR = Math.min(W, H) * 0.55;
        simNodes.forEach(d => {
          const a = Math.random() * 2 * Math.PI;
          const r = Math.random() * spreadR;
          d.x = W/2 + Math.cos(a) * r;
          d.y = H/2 + Math.sin(a) * r;
        });
        sim.alpha(0.5).restart();
        // After layout settles, auto-fit
        const onEnd = () => {
          const b = g.node()?.getBBox();
          if (b && b.width > 0 && b.height > 0) {
            const sc = 0.85 * Math.min(W / b.width, H / b.height);
            const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
            svg.transition().duration(600).call(
              (zoom as any).transform,
              (d3 as any).zoomIdentity.translate(W / 2 - cx * sc, H / 2 - cy * sc).scale(sc)
            );
            window.dispatchEvent(new CustomEvent("zoom-changed", { detail: Math.round(sc * 100) }));
          }
          sim.on("end", null); // one-shot
        };
        sim.on("end", onEnd);
      },
      fit: () => {
        const b = g.node()?.getBBox();
        if (b && b.width > 0 && b.height > 0) {
          const sc = 0.85 * Math.min(W / b.width, H / b.height);
          const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
          svg.transition().duration(600).call(
            (zoom as any).transform,
            (d3 as any).zoomIdentity.translate(W / 2 - cx * sc, H / 2 - cy * sc).scale(sc)
          );
          window.dispatchEvent(new CustomEvent("zoom-changed", { detail: Math.round(sc * 100) }));
        }
      },
      zoomTo: (pct: number) => {
        const s = pct / 100;
        svg.transition().duration(300).call(
          (zoom as any).transform,
          (d3 as any).zoomIdentity.translate(W / 2 * (1 - s), H / 2 * (1 - s)).scale(s)
        );
        window.dispatchEvent(new CustomEvent("zoom-changed", { detail: pct }));
      },
    };

    const sim = (d3 as any).forceSimulation(simNodes)
      .force("link", (d3 as any).forceLink(simLinks as any).id((d: any) => d.id)
        .distance((l: any) => {
          const sid = l.source.id || l.source;
          const tid = l.target.id || l.target;
          const s = nodeMap.get(sid);
          const t = nodeMap.get(tid);
          return (s?.radius || 7) + (t?.radius || 7) + FORCE.linkDist;
        }))
      .force("charge", (d3 as any).forceManyBody().strength(FORCE.charge))
      .force("collide", (d3 as any).forceCollide().radius((d: any) => d.radius + FORCE.collidePad))
      .force("center", (d3 as any).forceCenter(W / 2, H / 2).strength(FORCE.centerStr))
      .force("radial", (d3 as any).forceRadial(Math.min(W, H) * 0.55, W/2, H/2).strength(0.1));

    // ResizeObserver: update center when sidebar toggles
    let obs: ResizeObserver | null = null;
    if (svgRef.current) {
      obs = new ResizeObserver(() => {
        const nw = svgRef.current?.clientWidth || 800;
        const nh = svgRef.current?.clientHeight || 600;
        sim.force("center", (d3 as any).forceCenter(nw / 2, nh / 2).strength(FORCE.centerStr));
        sim.force("radial", (d3 as any).forceRadial(Math.min(nw, nh) * 0.45, nw/2, nh/2).strength(0.1));
        sim.alpha(0.1).restart();
      });
      obs.observe(svgRef.current);
    }

    // Links
    const link = g.append("g").selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", "#d1d5db")
      .attr("stroke-width", (l: any) => Math.min(l.weight * 1.5, 4))
      .attr("stroke-opacity", 0.6);

    // Link labels
    const linkLabel = g.append("g").selectAll("text")
      .data(simLinks)
      .join("text")
      .text((d: any) => d.label)
      .attr("font-size", 9)
      .attr("font-family", "'JetBrains Mono', monospace")
      .attr("fill", "#9ca3af")
      .attr("text-anchor", "middle")
      .attr("dy", -4)
      .attr("opacity", 0);

    // Nodes group
    const node = g.append("g").selectAll("g")
      .data(simNodes)
      .join("g")
      .attr("data-id", (d: any) => d.id)
      .attr("cursor", "grab")
      .call(
        (d3 as any).drag()
          .on("start", (e: any, d: any) => {
            if (!e.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on("drag", (e: any, d: any) => { d.fx = e.x; d.fy = e.y; })
          .on("end", (e: any, d: any) => {
            if (!e.active) sim.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      ) as any;

    // Node circles
    node.append("circle")
      .attr("r", (d: any) => d.radius)
      .attr("fill", (d: any) => COLORS[d.type] || DEFAULT_COLOR)
      .attr("stroke", "#fafafa")
      .attr("stroke-width", 1.5);

    // Node labels
    node.append("text")
      .text((d: any) => d.label)
      .attr("font-family", "'JetBrains Mono', monospace")
      .attr("font-size", (d: any) => d.radius >= 14 ? 11 : 9)
      .attr("font-weight", (d: any) => d.radius >= 14 ? "600" : "400")
      .attr("fill", (d: any) => d.radius >= 14 ? "#000" : "#666")
      .attr("text-anchor", "middle")
      .attr("dy", (d: any) => d.radius + 13);

    // Shared highlight logic
    let selectedId: string | null = null;
    function applyHighlight(hoverId: string | null) {
      const id = hoverId || selectedId;
      if (!id) {
        node.select("circle").transition().duration(150).attr("r", (d: any) => d.radius).attr("opacity", 1);
        node.select("text").transition().duration(150).attr("fill", (d: any) => d.radius >= 14 ? "#000" : "#666");
        link.transition().duration(150).attr("stroke-opacity", 0.6).attr("stroke", "#d1d5db");
        linkLabel.transition().duration(150).attr("opacity", 0);
        g.select("#tooltip").remove();
        return;
      }
      const connected = new Set<string>();
      simLinks.forEach(l => {
        if ((l.source as any as SimNode).id === id || (l.target as any as SimNode).id === id) {
          connected.add((l.source as any as SimNode).id === id ? (l.target as any as SimNode).id : (l.source as any as SimNode).id);
        }
      });
      node.select("circle").attr("opacity", (n: any) => n.id === id || connected.has(n.id) ? 1 : 0.15);
      node.select("circle").attr("r", (d: any) => d.id === id || connected.has(d.id) ? d.radius * 1.15 : d.radius);
      node.select("text").attr("fill", (d: any) => d.id === id || connected.has(d.id) ? "#000" : (d.radius >= 14 ? "#000" : "#666"));
      link.attr("stroke-opacity", (l: any) =>
        (l.source as any as SimNode).id === id || (l.target as any as SimNode).id === id ? 0.9 : 0.05
      ).attr("stroke", (l: any) =>
        (l.source as any as SimNode).id === id || (l.target as any as SimNode).id === id ? "#374151" : "#d1d5db"
      );
      linkLabel.attr("opacity", (l: any) =>
        (l.source as any as SimNode).id === id || (l.target as any as SimNode).id === id ? 1 : 0
      );
    }

    // Hover (temporary, reverts to selection)
    node.on("mouseenter", function(_: any, d: any) {
      if (selectedId) return; // don't override selection
      applyHighlight(d.id);
    }).on("mouseleave", function() {
      if (selectedId) return;
      applyHighlight(null);
    }).on("click", function(_: any, d: any) {
      selectedId = d.id;
      applyHighlight(d.id);
      clickRef.current(d.id);
      const s_ = 1.5;
      svg.transition().duration(500).call(
        (zoom as any).transform,
        (d3 as any).zoomIdentity.translate(W / 2 - d.x * s_, H / 2 - d.y * s_).scale(s_)
      );
    });

    // Use native DOM for background click/dblclick — avoids D3 event conflicts
    const svgEl = svg.node();
    let bgTimer: any = null;
    function onBgClick(e: MouseEvent) {
      if (e.target !== svgEl) return; // only background, not nodes/edges/labels
      selectedId = null;
      applyHighlight(null);
      if (bgTimer) {
        clearTimeout(bgTimer); bgTimer = null;
        const b = g.node()?.getBBox();
        if (b && b.width > 0 && b.height > 0) {
          const sc = 0.85 * Math.min(W / b.width, H / b.height);
          const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
          svg.transition().duration(600).call(
            (zoom as any).transform,
            (d3 as any).zoomIdentity.translate(W / 2 - cx * sc, H / 2 - cy * sc).scale(sc)
          );
        }
      } else {
        bgTimer = setTimeout(() => { bgTimer = null; }, 350);
      }
    }
    svgEl?.addEventListener("click", onBgClick);


    // Tick
    sim.on("tick", () => {
      link
        .attr("x1", (d: any) => (d.source as any as SimNode).x)
        .attr("y1", (d: any) => (d.source as any as SimNode).y)
        .attr("x2", (d: any) => (d.target as any as SimNode).x)
        .attr("y2", (d: any) => (d.target as any as SimNode).y);
      linkLabel
        .attr("x", (d: any) => ((d.source as any as SimNode).x + (d.target as any as SimNode).x) / 2)
        .attr("y", (d: any) => ((d.source as any as SimNode).y + (d.target as any as SimNode).y) / 2);
      // Clamp positions
      simNodes.forEach(d => {
        if (d.fx == null) { d.x = Math.max(-200, Math.min(W + 200, d.x)); d.y = Math.max(-200, Math.min(H + 200, d.y)); }
      });
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
      const tip = g.select("#tooltip");
      if (!tip.empty() && tip.datum()) {
        const td = tip.datum() as any as SimNode;
        tip.attr("x", td.x).attr("y", td.y - td.radius - 20);
      }
    });

    return () => { sim.stop(); if (obs) obs.disconnect(); svgEl?.removeEventListener("click", onBgClick); delete (window as any).__graphZoom; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey]);

  return (
    <div className="relative h-full w-full" style={{ background: "#fafafa" }}>
      <canvas ref={bgRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />
      <svg ref={svgRef} id="graph-svg" className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }} />
    </div>
  );
}
