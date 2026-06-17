"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { listWorkspaces, createWorkspace, logout } from "@/lib/api";
import type { Workspace } from "@/lib/types";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("token")) {
      setLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (loggedIn) {
      listWorkspaces().then((wss) => {
        setWorkspaces(wss);
        // Auto-redirect to latest workspace
        if (wss.length > 0) {
          router.push("/workspace/" + wss[0].id);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [loggedIn, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const wsId = await createWorkspace(name, "named");
      router.push("/workspace/" + wsId);
    } catch (err) {
      console.error("Create failed:", err);
    } finally {
      setCreating(false);
    }
  };

  if (!loggedIn) {
    return <LoginForm onLogin={() => setLoggedIn(true)} />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-muted text-sm">加载中...</p>
      </div>
    );
  }

  // No workspaces — show welcome / create
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-bold text-text" style={{ fontFamily: '"Noto Serif SC", serif' }}>
          Knowledge Graph Explorer
        </h1>
        <p className="mb-6 text-sm text-muted">上传文本文档，AI 自动抽取实体和关系，生成交互式知识图谱</p>
        <form onSubmit={handleCreate} className="space-y-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="输入工作区名称" autoFocus required
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none" />
          <button type="submit" disabled={creating}
            className="w-full rounded px-4 py-2 text-sm font-medium text-white hover:opacity-90 active:scale-[0.97] transition-all duration-150 disabled:opacity-50"
            style={{ backgroundColor: "#2c3e6b" }}>
            {creating ? "创建中..." : "创建第一个工作区"}
          </button>
        </form>
        <button onClick={() => { logout(); setLoggedIn(false); }}
          className="mt-4 text-xs text-muted hover:text-accent transition-colors">登出</button>
      </div>
    </div>
  );
}
