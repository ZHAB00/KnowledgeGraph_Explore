"use client";

import { useEffect, useState } from "react";
import { listWorkspaces, deleteWorkspace } from "@/lib/api";
import type { Workspace } from "@/lib/types";
import Link from "next/link";

export default function WorkspaceList({ refreshKey }: { refreshKey: number }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    listWorkspaces().then(setWorkspaces).catch(() => {});
  }, [refreshKey]);

  if (workspaces.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="mb-3 text-sm font-medium text-muted">历史工作区</h2>
      <div className="space-y-2">
        {workspaces.map((ws) => (
          <div key={ws.id}
            className="flex items-center justify-between rounded border border-border bg-surface p-3">
            <Link href={`/workspace/${ws.id}`}
              className="text-sm text-text hover:text-[#2c3e6b] transition-colors">
              {ws.name}
              <span className="ml-2 text-xs text-muted">
                {ws.entity_type === "named" ? "命名实体" : "概念关系"}
                {" · "}{ws.file_count} 个文件{" · "}
                {ws.status === "ready" ? "就绪" : ws.status === "processing" ? "处理中" : "错误"}
              </span>
            </Link>
            <button onClick={async () => {
              await deleteWorkspace(ws.id);
              setWorkspaces((prev) => prev.filter((w) => w.id !== ws.id));
            }} className="text-xs text-muted hover:text-red-500 transition-colors">
              删除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
