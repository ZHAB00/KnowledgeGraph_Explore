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
        radius: 4 + (d / maxD) * 12, // 6-22px
        x: 0, y: 0,
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

    const zoom = (d3 as any).zoom()
      .scaleExtent([0.5, 3])
      .on("zoom", (e: any) => g.attr("transform", e.transform.toString()));
    svg.call(zoom);

    const sim = (d3 as any).forceSimulation(simNodes)
      .force("link", (d3 as any).forceLink(simLinks as any).id(d => d.id)
        .distance((l: any) => {
          const sid = l.source.id || l.source;
          const tid = l.target.id || l.target;
          const s = nodeMap.get(sid);
          const t = nodeMap.get(tid);
          return (s?.radius || 7) + (t?.radius || 7) + 60;
        }))
      .force("charge", (d3 as any).forceManyBody().strength(-150))
      .force("collide", (d3 as any).forceCollide().radius((d: any) => d.radius + 15))
      .force("center", (d3 as any).forceCenter(W / 2, H / 2).strength(0.05));

    // Links
    const link = g.append("g").selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", "#d1d5db")
      .attr("stroke-width", l => Math.min(l.weight * 1.5, 4))
      .attr("stroke-opacity", 0.6);

    // Link labels
    const linkLabel = g.append("g").selectAll("text")
      .data(simLinks)
      .join("text")
      .text(d => d.label)
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
      .attr("cursor", "grab")
      .call(
        (d3 as any).drag()
          .on("start", (e: any, d) => {
            if (!e.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
            d3.select(e.sourceEvent.target.closest("g")).select("circle").attr("stroke-width", 3);
          })
          .on("drag", (e: any, d) => { d.fx = e.x; d.fy = e.y; })
          .on("end", (e: any, d) => {
            if (!e.active) sim.alphaTarget(0);
            d.fx = null; d.fy = null;
            d3.select(e.sourceEvent.target.closest("g")).select("circle").attr("stroke-width", 1.5);
          })
      ) as any;

    // Node circles
    node.append("circle")
      .attr("r", d => d.radius)
      .attr("fill", d => COLORS[d.type] || DEFAULT_COLOR)
      .attr("stroke", "#fafafa")
      .attr("stroke-width", 1.5);

    // Node labels
    node.append("text")
      .text(d => d.label)
      .attr("font-family", "'JetBrains Mono', monospace")
      .attr("font-size", d => d.radius >= 14 ? 11 : 9)
      .attr("font-weight", d => d.radius >= 14 ? "600" : "400")
      .attr("fill", d => d.radius >= 14 ? "#000" : "#666")
      .attr("text-anchor", "middle")
      .attr("dy", d => d.radius + 13);

    // Hover
    node.on("mouseenter", function(_, d) {
      const el = d3.select(this);
      el.select("circle").transition().duration(150).attr("r", d.radius * 1.3);
      el.select("text").transition().duration(150).attr("fill", "#000");

      // Highlight connected links
      const connected = new Set<string>();
      simLinks.forEach(l => {
        if ((l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id) {
          connected.add((l.source as SimNode).id === d.id ? (l.target as SimNode).id : (l.source as SimNode).id);
        }
      });
      node.select("circle").attr("opacity", n => n.id === d.id || connected.has(n.id) ? 1 : 0.15);
      link.attr("stroke-opacity", l =>
        (l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id ? 0.9 : 0.05
      ).attr("stroke", l =>
        (l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id ? "#374151" : "#d1d5db"
      );
      linkLabel.attr("opacity", l =>
        (l.source as SimNode).id === d.id || (l.target as SimNode).id === d.id ? 1 : 0
      );

      // Tooltip
      g.select("#tooltip").remove();
      const tip = g.append("text")
        .attr("id", "tooltip")
        .datum(d)
        .attr("x", d.x)
        .attr("y", d.y - d.radius - 20)
        .attr("text-anchor", "middle")
        .attr("font-family", "'JetBrains Mono', monospace")
        .attr("font-size", 10)
        .attr("fill", "#1a1a1a")
        .attr("font-weight", "600")
        .text(d.label + " (" + d.type + ")");
    }).on("mouseleave", function() {
      node.select("circle").transition().duration(150).attr("r", d => d.radius).attr("opacity", 1);
      node.select("text").transition().duration(150).attr("fill", d => d.radius >= 14 ? "#000" : "#666");
      link.transition().duration(150).attr("stroke-opacity", 0.6).attr("stroke", "#d1d5db");
      linkLabel.transition().duration(150).attr("opacity", 0);
      g.select("#tooltip").remove();
    }).on("click", function(_, d) {
      clickRef.current(d.id);
    });

    // Tick
    sim.on("tick", () => {
      link
        .attr("x1", d => (d.source as SimNode).x)
        .attr("y1", d => (d.source as SimNode).y)
        .attr("x2", d => (d.target as SimNode).x)
        .attr("y2", d => (d.target as SimNode).y);
      linkLabel
        .attr("x", d => ((d.source as SimNode).x + (d.target as SimNode).x) / 2)
        .attr("y", d => ((d.source as SimNode).y + (d.target as SimNode).y) / 2);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
      const tip = g.select("#tooltip");
      if (!tip.empty() && tip.datum()) {
        const td = tip.datum() as SimNode;
        tip.attr("x", td.x).attr("y", td.y - td.radius - 20);
      }
    });

    // Wait for simulation to settle, then gently fit to container
    const fitTimer = setTimeout(() => {
      const bounds = g.node()?.getBBox();
      if (bounds && bounds.width > 0 && bounds.height > 0) {
        const scale = 0.8 * Math.min(W / bounds.width, H / bounds.height);
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;
        svg.transition().duration(800).call(
          (zoom as any).transform,
          (d3 as any).zoomIdentity.translate(W / 2 - cx * scale, H / 2 - cy * scale).scale(scale)
        );
      }
    }, 2500);

    return () => { sim.stop(); clearTimeout(fitTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey]);

  return (
    <div className="relative h-full w-full" style={{ background: "#fafafa" }}>
      <canvas ref={bgRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />
      <svg ref={svgRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }} />
    </div>
  );
}
