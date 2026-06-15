"use client";

import { useState } from "react";
import { createWorkspace, uploadFile, triggerExtract } from "@/lib/api";

interface Props {
  onCreated: (workspaceId: string) => void;
}

export default function WorkspaceCreate({ onCreated }: Props) {
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState<"named" | "concept">("named");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || files.length === 0) return;
    setLoading(true);
    try {
      setProgress("创建工作区...");
      const wsId = await createWorkspace(name, entityType);
      for (const file of files) {
        setProgress(`上传 ${file.name}...`);
        await uploadFile(wsId, file);
      }
      setProgress("开始抽取...");
      await triggerExtract(wsId, entityType);
      onCreated(wsId);
    } catch (err) {
      setProgress(`出错: ${err instanceof Error ? err.message : "未知错误"}`);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="工作区名称，如：三国人物关系"
        className="w-full rounded border border-border bg-bg px-3 py-2 text-sm focus:border-accent focus:outline-none"
        required
      />

      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" name="et" value="named"
            checked={entityType === "named"} onChange={() => setEntityType("named")} />
          命名实体
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="et" value="concept"
            checked={entityType === "concept"} onChange={() => setEntityType("concept")} />
          概念关系
        </label>
      </div>

      <div className="rounded-lg border-2 border-dashed border-border p-6 text-center">
        <input type="file" multiple accept=".txt,.md,.pdf,.docx"
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          className="text-sm text-muted" />
        <p className="mt-1 text-xs text-muted">支持 .txt .md .pdf .docx（可多选）</p>
      </div>

      {files.length > 0 && (
        <ul className="text-xs text-muted space-y-0.5">
          {files.map((f, i) => (
            <li key={i}>{f.name} ({(f.size / 1024).toFixed(1)} KB)</li>
          ))}
        </ul>
      )}

      <button type="submit" disabled={loading}
        className="w-full rounded px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: "#2c3e6b" }}>
        {loading ? progress : "创建并开始分析"}
      </button>
    </form>
  );
}
