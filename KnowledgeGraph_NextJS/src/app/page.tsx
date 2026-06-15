"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import WorkspaceCreate from "@/components/WorkspaceCreate";
import WorkspaceList from "@/components/WorkspaceList";
import DemoButton from "@/components/DemoButton";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("token")) {
      setLoggedIn(true);
    }
  }, []);

  const handleCreated = useCallback((workspaceId: string) => {
    setRefreshKey((k) => k + 1);
    router.push(`/workspace/${workspaceId}`);
  }, [router]);

  if (!loggedIn) {
    return <LoginForm onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text"
            style={{ fontFamily: '"Noto Serif SC", serif' }}>
            Knowledge Graph Explorer
          </h1>
          <p className="mt-1 text-sm text-muted">
            上传文档，AI 自动构建知识图谱
          </p>
        </div>
        <DemoButton onCreated={handleCreated} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-medium text-text">新建工作区</h2>
        <WorkspaceCreate onCreated={handleCreated} />
      </div>

      <WorkspaceList refreshKey={refreshKey} />
    </div>
  );
}
