"use client";

import { useEffect, useState } from "react";
import { listWorkspaces, deleteWorkspace } from "@/lib/api";
import type { Workspace } from "@/lib/types";
import Link from "next/link";

export default function HistoryPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  useEffect(() => {
    listWorkspaces().then(setWorkspaces).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-text"
          style={{ fontFamily: '"Noto Serif SC", serif' }}>
          历史工作区
        </h1>
        <Link href="/" className="text-sm text-muted hover:text-[#2c3e6b] transition-colors">
          ← 返回首页
        </Link>
      </div>

      {workspaces.length === 0 && (
        <p className="text-sm text-muted">暂无记录</p>
      )}

      <div className="space-y-3">
        {workspaces.map((ws) => (
          <div key={ws.id}
            className="flex items-center justify-between rounded border border-border bg-surface p-4 shadow-sm">
            <div>
              <Link href={`/workspace/${ws.id}`}
                className="text-sm font-medium text-text hover:text-[#2c3e6b] transition-colors">
                {ws.name}
              </Link>
              <div className="mt-1 text-xs text-muted">
                {ws.entity_type === "named" ? "命名实体" : "概念关系"}
                {" · "}{ws.file_count} 个文件{" · "}{ws.status}{" · "}
                {new Date(ws.created_at).toLocaleDateString("zh-CN")}
              </div>
            </div>
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
