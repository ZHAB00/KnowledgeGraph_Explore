"use client";

import { useState } from "react";
import { uploadFile } from "@/lib/api";

interface Props {
  workspaceId: string;
  onUploaded: () => void;
}

export default function UploadZone({ workspaceId, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        await uploadFile(workspaceId, file);
      }
      onUploaded();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded border-2 border-dashed border-border p-3 text-center">
      <input type="file" multiple accept=".txt,.md,.pdf,.docx"
        onChange={handleChange} disabled={uploading}
        className="text-xs text-muted" />
      <p className="mt-1 text-xs text-muted">
        {uploading ? "上传中..." : "追加文件 (.txt .md .pdf .docx)"}
      </p>
    </div>
  );
}
