"use client";

import { useState } from "react";
import { createDemo, triggerExtract } from "@/lib/api";

interface Props {
  onCreated: (workspaceId: string) => void;
}

export default function DemoButton({ onCreated }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleDemo() {
    setLoading(true);
    try {
      const wsId = await createDemo();
      await triggerExtract(wsId, "named");
      onCreated(wsId);
    } catch (err) {
      console.error("Demo failed:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleDemo} disabled={loading}
      className="rounded px-3 py-1.5 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
      style={{ backgroundColor: "#2c3e6b" }}>
      {loading ? "加载中..." : "一键体验 Demo"}
    </button>
  );
}
