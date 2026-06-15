"use client";

import { useState, useCallback } from "react";
import { filterNodes, highlightSubgraph } from "@/lib/graph-layout";
import { semanticSearch } from "@/lib/api";

interface Props {
  workspaceId: string;
}

export default function SearchBar({ workspaceId }: Props) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    const cy = (window as any).__cy;
    if (cy) filterNodes(cy, val);
  }, []);

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !query.trim()) return;
    setSearching(true);
    try {
      const result = await semanticSearch(workspaceId, query.trim());
      const cy = (window as any).__cy;
      if (cy) highlightSubgraph(cy, result.subgraph_nodes.map((n) => n.id));
    } finally {
      setSearching(false);
    }
  }, [query, workspaceId]);

  return (
    <div className="relative">
      <span className="absolute left-3 top-2 text-sm text-muted">⌕</span>
      <input
        type="text"
        value={query}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="输入关键词过滤，回车语义搜索..."
        className="w-full rounded border border-border bg-bg py-2 pl-8 pr-3 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
      />
      {searching && (
        <span className="absolute right-3 top-2 text-xs text-muted">搜索中...</span>
      )}
    </div>
  );
}
