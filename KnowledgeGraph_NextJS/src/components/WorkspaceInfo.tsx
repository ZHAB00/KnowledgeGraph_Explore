import type { Workspace } from "@/lib/types";

interface Props {
  workspace: Workspace;
  entityType: "named" | "concept";
  onEntityTypeChange: (t: "named" | "concept") => void;
}

export default function WorkspaceInfo({ workspace, entityType, onEntityTypeChange }: Props) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-text"
        style={{ fontFamily: '"Noto Serif SC", serif' }}>
        {workspace.name}
      </h2>
      <div className="flex gap-3">
        <label className="flex items-center gap-1 text-xs cursor-pointer">
          <input type="radio" checked={entityType === "named"}
            onChange={() => onEntityTypeChange("named")} />
          命名实体
        </label>
        <label className="flex items-center gap-1 text-xs cursor-pointer">
          <input type="radio" checked={entityType === "concept"}
            onChange={() => onEntityTypeChange("concept")} />
          概念关系
        </label>
      </div>
      <p className="text-xs text-muted">
        {workspace.file_count} 个文件 · {workspace.status === "ready" ? "就绪" : workspace.status}
      </p>
    </div>
  );
}
