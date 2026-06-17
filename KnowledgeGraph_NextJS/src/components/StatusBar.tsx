"use client";

interface Props {
  status: string;
  phase: string;
  progress: number;
  nodeCount: number;
  edgeCount: number;
  errorMessage?: string;
  rawOutput?: string;
}

export default function StatusBar({ status, phase, progress, nodeCount, edgeCount, errorMessage, rawOutput }: Props) {
  const phaseLabels: Record<string, string> = {
    loading: "加载文件...", chunking: "文本分块...", extracting: "AI 抽取中...",
    merging: "合并去重...", embedding: "生成向量...", saving: "保存...",
    done: "就绪", idle: "就绪",
  };

  return (
    <div className="border-t border-border bg-surface px-4 py-2">
      <div className="flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-3">
          {status === "processing" && (
            <>
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
              <span>{phaseLabels[phase] || phase}</span>
              <span>{Math.round(progress * 100)}%</span>
            </>
          )}
          {status === "ready" && (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
              <span>就绪</span>
            </>
          )}
          {status === "error" && (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
              <span className="text-red-500">{errorMessage || "抽取失败"}</span>
              {rawOutput && (
                <button onClick={() => {
                  const w = window.open("", "_blank");
                  if (w) w.document.write(`<pre>${rawOutput}</pre>`);
                }} className="underline hover:text-accent">查看原始输出</button>
              )}
            </>
          )}
        </div>
        <div className="flex gap-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <span>{nodeCount} nodes</span>
          <span>{edgeCount} edges</span>
        </div>
      </div>
    </div>
  );
}
