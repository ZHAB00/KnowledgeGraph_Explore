"use client";

export default function DesignPreview() {
  const colors = {
    bg: "#fafafa",
    surface: "#ffffff",
    border: "#e5e5e5",
    text: "#1a1a1a",
    muted: "#6b7280",
    accent: "#2c3e6b",
  };

  const nodeColors = {
    person: "#64748b",
    org: "#78716c",
    concept: "#d4a574",
    location: "#8b8ca0",
    event: "#94a3b8",
  };

  const sampleNodes = [
    { label: "Sam Altman", type: "person", color: nodeColors.person },
    { label: "OpenAI", type: "organization", color: nodeColors.org },
    { label: "GPT-4o", type: "concept", color: nodeColors.concept },
    { label: "旧金山", type: "location", color: nodeColors.location },
    { label: "DevDay 2024", type: "event", color: nodeColors.event },
  ];

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: colors.bg }}>
      <h1
        className="mb-8 text-2xl font-bold"
        style={{
          fontFamily: '"Noto Serif SC", serif',
          color: colors.text,
        }}
      >
        Knowledge Graph Explorer — 设计预览
      </h1>

      {/* Color palette */}
      <section className="mb-10">
        <h2
          className="mb-4 text-lg font-medium"
          style={{ fontFamily: '"Noto Serif SC", serif' }}
        >
          调色板
        </h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(colors).map(([name, hex]) => (
            <div key={name} className="text-center">
              <div
                className="h-16 w-16 rounded-lg border border-border shadow-sm"
                style={{ backgroundColor: hex }}
              />
              <p className="mt-1 text-xs text-muted">{name}</p>
              <p
                className="text-xs"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {hex}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Node colors */}
      <section className="mb-10">
        <h2
          className="mb-4 text-lg font-medium"
          style={{ fontFamily: '"Noto Serif SC", serif' }}
        >
          节点配色
        </h2>
        <div className="flex flex-wrap gap-4">
          {sampleNodes.map((node) => (
            <div key={node.label} className="flex items-center gap-2">
              <div
                className="h-4 w-4 rounded-full border-2"
                style={{
                  backgroundColor: node.color,
                  borderColor: colors.bg,
                }}
              />
              <span
                className="text-xs"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {node.label}
              </span>
              <span className="text-xs text-muted">({node.type})</span>
            </div>
          ))}
        </div>
      </section>

      {/* Typography */}
      <section className="mb-10">
        <h2
          className="mb-4 text-lg font-medium"
          style={{ fontFamily: '"Noto Serif SC", serif' }}
        >
          字体层级
        </h2>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted mb-1">Display · Noto Serif SC · 24px Bold</p>
            <p
              className="text-2xl font-bold"
              style={{
                fontFamily: '"Noto Serif SC", serif',
                color: colors.text,
              }}
            >
              Knowledge Graph Explorer
            </p>
          </div>

          <div>
            <p className="text-xs text-muted mb-1">Heading · Noto Serif SC · 18px Medium</p>
            <p
              className="text-lg font-medium"
              style={{
                fontFamily: '"Noto Serif SC", serif',
                color: colors.text,
              }}
            >
              工作区：三国人物关系
            </p>
          </div>

          <div>
            <p className="text-xs text-muted mb-1">Body · System Sans · 14px</p>
            <p className="text-sm" style={{ color: colors.text }}>
              上传文档，AI 自动构建知识图谱。支持命名实体和概念关系两种抽取模式。
            </p>
          </div>

          <div>
            <p className="text-xs text-muted mb-1">Node Label · JetBrains Mono · 11px</p>
            <p
              className="text-xs"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                color: colors.text,
              }}
            >
              曹操 → 任职 → 东汉丞相
            </p>
          </div>

          <div>
            <p className="text-xs text-muted mb-1">Caption · System Sans · 12px muted</p>
            <p className="text-xs" style={{ color: colors.muted }}>
              128 节点 · 256 条边 · 3 个文件
            </p>
          </div>
        </div>
      </section>

      {/* Mock graph canvas */}
      <section className="mb-10">
        <h2
          className="mb-4 text-lg font-medium"
          style={{ fontFamily: '"Noto Serif SC", serif' }}
        >
          图谱画布示意
        </h2>
        <div
          className="relative h-64 rounded-lg border border-border"
          style={{ backgroundColor: colors.bg }}
        >
          {/* Simulated nodes */}
          {[
            { x: 120, y: 80, color: nodeColors.person, label: "Sam Altman", type: "person" },
            { x: 320, y: 60, color: nodeColors.org, label: "OpenAI", type: "org" },
            { x: 280, y: 160, color: nodeColors.concept, label: "GPT-4o", type: "concept" },
            { x: 460, y: 100, color: nodeColors.concept, label: "MMLU 88.7%", type: "metric" },
            { x: 180, y: 180, color: nodeColors.org, label: "Microsoft", type: "org" },
            { x: 400, y: 200, color: nodeColors.person, label: "Satya Nadella", type: "person" },
          ].map((n) => (
            <div
              key={n.label}
              className="absolute flex flex-col items-center"
              style={{ left: n.x, top: n.y }}
            >
              <div
                className="h-3 w-3 rounded-full border-2"
                style={{ backgroundColor: n.color, borderColor: colors.bg }}
                title={n.label}
              />
              <span
                className="mt-1 whitespace-nowrap text-xs"
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  color: colors.text,
                  fontSize: "10px",
                }}
              >
                {n.label}
              </span>
            </div>
          ))}

          {/* Simulated edges */}
          <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: "none" }}>
            <line x1="132" y1="86" x2="320" y2="66" stroke="#d1d5db" strokeWidth="1" />
            <line x1="320" y1="72" x2="280" y2="160" stroke="#d1d5db" strokeWidth="1" />
            <line x1="180" y1="186" x2="320" y2="72" stroke="#d1d5db" strokeWidth="1" />
            <line x1="400" y1="206" x2="320" y2="72" stroke="#d1d5db" strokeWidth="1" />
            <line x1="280" y1="166" x2="460" y2="106" stroke="#d1d5db" strokeWidth="1" />
          </svg>

          <div
            className="absolute bottom-3 right-3 rounded bg-surface px-2 py-1 text-xs shadow-sm"
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              color: colors.muted,
            }}
          >
            6 nodes · 5 edges
          </div>
        </div>
      </section>

      {/* UI elements */}
      <section className="mb-10">
        <h2
          className="mb-4 text-lg font-medium"
          style={{ fontFamily: '"Noto Serif SC", serif' }}
        >
          UI 元素
        </h2>

        <div className="space-y-4">
          {/* Button */}
          <div>
            <p className="text-xs text-muted mb-2">Primary Button</p>
            <button
              className="rounded px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: colors.accent }}
            >
              创建并开始分析
            </button>
          </div>

          {/* Input */}
          <div>
            <p className="text-xs text-muted mb-2">Text Input</p>
            <input
              type="text"
              placeholder="输入关键词，回车语义搜索..."
              className="w-64 rounded border px-3 py-2 text-sm"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.bg,
                color: colors.text,
              }}
            />
          </div>

          {/* Search bar */}
          <div>
            <p className="text-xs text-muted mb-2">Search Bar (with icon feel)</p>
            <div className="relative w-64">
              <span className="absolute left-3 top-2 text-sm" style={{ color: colors.muted }}>
                ⌕
              </span>
              <input
                type="text"
                placeholder="搜索节点..."
                className="w-full rounded border py-2 pl-8 pr-3 text-sm"
                style={{
                  borderColor: colors.border,
                  backgroundColor: colors.bg,
                  color: colors.text,
                }}
              />
            </div>
          </div>

          {/* Card */}
          <div>
            <p className="text-xs text-muted mb-2">Card / Surface</p>
            <div
              className="w-80 rounded-lg border p-4 shadow-sm"
              style={{ borderColor: colors.border, backgroundColor: colors.surface }}
            >
              <p className="text-sm font-medium" style={{ color: colors.text }}>
                三国人物关系
              </p>
              <p className="mt-1 text-xs" style={{ color: colors.muted }}>
                命名实体 · 3 个文件 · 就绪
              </p>
            </div>
          </div>

          {/* Status bar */}
          <div>
            <p className="text-xs text-muted mb-2">Status Bar</p>
            <div
              className="flex w-96 items-center justify-between border-t px-4 py-2"
              style={{ borderColor: colors.border, backgroundColor: colors.surface }}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
                <span className="text-xs" style={{ color: colors.muted }}>
                  就绪
                </span>
              </div>
              <div className="flex gap-3">
                <span
                  className="text-xs"
                  style={{ fontFamily: '"JetBrains Mono", monospace', color: colors.muted }}
                >
                  128 节点
                </span>
                <span
                  className="text-xs"
                  style={{ fontFamily: '"JetBrains Mono", monospace', color: colors.muted }}
                >
                  256 边
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
