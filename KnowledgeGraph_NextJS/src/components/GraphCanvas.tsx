"use client";

import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import { createGraphConfig, setupInteractions } from "@/lib/graph-layout";
import type { GraphNode, GraphEdge } from "@/lib/types";

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick: (nodeId: string) => void;
}

export default function GraphCanvas({ nodes, edges, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const elements: cytoscape.ElementDefinition[] = [
      ...nodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label.length > 20 ? n.label.slice(0, 20) + "…" : n.label,
          type: n.type,
          metadata: n.metadata,
        },
      })),
      ...edges.map((e) => ({
        data: {
          id: `${e.source}_${e.target}_${e.label}`,
          source: e.source,
          target: e.target,
          label: e.label,
          weight: e.weight,
        },
      })),
    ];

    const cy = cytoscape(createGraphConfig(containerRef.current, elements));
    setupInteractions(cy, onNodeClick);
    cyRef.current = cy;

    // Expose to window for SearchBar and ExportButton
    if (typeof window !== "undefined") {
      (window as any).__cy = cy;
    }

    return () => {
      cy.destroy();
      cyRef.current = null;
      if (typeof window !== "undefined") {
        delete (window as any).__cy;
      }
    };
  }, [nodes, edges, onNodeClick]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ background: "#fafafa" }}
    />
  );
}
