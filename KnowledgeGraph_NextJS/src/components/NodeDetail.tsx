"use client";

import type { GraphNode } from "@/lib/types";

interface Props {
  node: GraphNode | null;
  onClose: () => void;
}

export default function NodeDetail({ node, onClose }: Props) {
  if (!node) return null;

  return (
    <div className="absolute right-4 top-4 z-20 w-72 rounded-lg border border-border bg-white p-4 shadow-lg">
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-text"
          style={{ fontFamily: '"Noto Serif SC", serif' }}>
          {node.label}
        </h3>
        <button onClick={onClose} className="text-muted hover:text-text text-lg leading-none">
          ×
        </button>
      </div>
      <div className="mt-2 space-y-1 text-xs">
        <p className="text-muted">
          类型：<span
            className="font-medium"
            style={{ fontFamily: '"JetBrains Mono", monospace', color: "#1a1a1a" }}
          >
            {node.type}
          </span>
        </p>
        {node.metadata && Object.entries(node.metadata).map(([key, value]) => (
          <p key={key} className="text-muted">
            <span className="capitalize">{key}：</span>
            <span className="text-text">
              {typeof value === "string" ? value.slice(0, 200) : String(value)}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}
