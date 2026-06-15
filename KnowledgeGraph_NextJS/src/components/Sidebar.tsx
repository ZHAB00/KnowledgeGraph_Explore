"use client";

import { useState } from "react";
import WorkspaceInfo from "./WorkspaceInfo";
import UploadZone from "./UploadZone";
import SearchBar from "./SearchBar";
import ExportButton from "./ExportButton";
import type { Workspace } from "@/lib/types";
import Link from "next/link";

interface Props {
  workspace: Workspace;
  workspaceId: string;
  onEntityTypeChange: (t: "named" | "concept") => void;
  onReextract: () => void;
}

export default function Sidebar({ workspace, workspaceId, onEntityTypeChange, onReextract }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);

  if (collapsed) {
    return (
      <button onClick={() => setCollapsed(false)}
        className="absolute left-0 top-0 z-10 m-2 rounded border border-border bg-surface p-2 text-xs text-muted hover:text-text transition-colors">
        ☰
      </button>
    );
  }

  return (
    <div className="absolute left-0 top-0 z-10 m-2 w-64 space-y-4 rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-xs text-muted hover:text-[#2c3e6b] transition-colors">← 返回</Link>
        <button onClick={() => setCollapsed(true)} className="text-xs text-muted hover:text-text">✕</button>
      </div>

      <WorkspaceInfo workspace={workspace} entityType={workspace.entity_type as "named" | "concept"}
        onEntityTypeChange={onEntityTypeChange} />

      <SearchBar workspaceId={workspaceId} />

      <UploadZone key={uploadKey} workspaceId={workspaceId}
        onUploaded={() => { setUploadKey((k) => k + 1); onReextract(); }} />

      <div className="flex gap-2">
        <ExportButton format="png" />
        <ExportButton format="svg" />
      </div>
    </div>
  );
}
