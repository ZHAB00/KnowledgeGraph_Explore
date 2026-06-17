"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { getGraph, getExtractStatus, listWorkspaces, uploadFile, createWorkspace, deleteWorkspace } from "@/lib/api";
import type { Workspace, GraphNode, GraphEdge, FileResult } from "@/lib/types";
import GraphCanvas from "@/components/GraphCanvas";
import NodeDetail from "@/components/NodeDetail";
import StatusBar from "@/components/StatusBar";
import SearchBar from "@/components/SearchBar";
import ExportButton from "@/components/ExportButton";

type FileEntry = { id: string; filename: string; size_chars: number };
const API = typeof window !== "undefined" && window.location.hostname === "localhost"
  ? "http://localhost:8765/api" : "/api";
function authHead(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const t = localStorage.getItem("token");
  return t ? { Authorization: "Bearer " + t } : {};
}

function fileDot(fr: FileResult | undefined, gType: string): string {
  if (!fr) return "bg-gray-300";
  const r = gType === "named" ? fr.result_named : fr.result_concept;
  if (r === "ok") return "bg-green-400";
  if (r === "error") return "bg-red-400";
  if (r === "processing") return "bg-amber-400 animate-pulse";
  return "bg-gray-300";
}

export default function WorkspacePage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [ws, setWs] = useState<Workspace>({ id: workspaceId, name: "加载中...", entity_type: "named", status: "ready", created_at: "", file_count: 0 });
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selNode, setSelNode] = useState<GraphNode | null>(null);
  const [sta, setSta] = useState({ status: "loading", phase: "idle", progress: 0, error_message: "" });
  const [gType, setGType] = useState<"named" | "concept">("named");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [fileRes, setFileRes] = useState<FileResult[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isProc = sta.status === "processing";

  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const gTypeRef = useRef(gType);
  gTypeRef.current = gType;
  const [errorMsg, setErrorMsg] = useState("");

  const loadGraph = useCallback(async (type: "named" | "concept") => {
    try { const s = await getGraph(workspaceId, type); setNodes(s.nodes || []); setEdges(s.edges || []); } catch (e) { setErrorMsg("加载图谱失败"); console.error(e); }
  }, [workspaceId]);

  const loadFiles = useCallback(async () => {
    try {
      const r = await fetch(API + "/workspaces/" + workspaceId + "/files", { headers: authHead() });
      if (r.ok) setFiles(await r.json()); else setErrorMsg("加载文件列表失败");
    } catch (e) { setErrorMsg("无法连接服务器"); console.error(e); }
  }, [workspaceId]);

  const loadAllWs = useCallback(async () => {
    try { const wss = await listWorkspaces(); setWorkspaces(wss); const w = wss.find((x: Workspace) => x.id === workspaceId); if (w) setWs(w); } catch (e) { console.error(e); }
  }, [workspaceId]);

  // Shared polling — uses refs to avoid stale closures
  // Sync zoom slider with graph
  useEffect(() => {
    const onZoom = (e: Event) => {
      const pct = (e as CustomEvent).detail;
      const slider = document.getElementById("zoom-slider") as HTMLInputElement | null;
      const label = document.getElementById("zoom-label");
      if (slider) slider.value = String(pct);
      if (label) label.textContent = pct + "%";
    };
    window.addEventListener("zoom-changed", onZoom);
    return () => window.removeEventListener("zoom-changed", onZoom);
  }, []);

  const startPoll = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      try {
        const st = await getExtractStatus(workspaceId);
        setSta({ status: st.status, phase: st.phase, progress: st.progress, error_message: st.error_message || "" });
        if (st.status === "ready" || st.status === "error" || ++attempts > 60) {
          loadGraph(gTypeRef.current); loadFiles(); loadAllWs();
          clearInterval(pollRef.current!);
        }
      } catch { clearInterval(pollRef.current!); }
    }, 2000);
  }, [workspaceId, loadGraph, loadFiles, loadAllWs]);

  useEffect(() => {
    loadAllWs(); loadGraph(gType); loadFiles(); startPoll();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, gType]);

  const doUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fl = e.target.files; if (!fl) return;
    setUploading(true);
    for (const f of Array.from(fl)) {
      if (f.size > 10 * 1024 * 1024) { alert("文件 " + f.name + " 超过 10MB 限制"); continue; }
      try { await uploadFile(workspaceId, f); } catch (err) { setErrorMsg("上传失败: " + f.name); console.error(err); }
    }
    setUploading(false);
    loadFiles();
    startPoll();
  };

  const doDelete = async (fid: string) => {
    const r = await fetch(API + "/workspaces/" + workspaceId + "/files/" + fid, { method: "DELETE", headers: authHead() });
    if (!r.ok) { alert("删除失败，请稍后重试"); return; }
    setFiles((prev) => prev.filter((x) => x.id !== fid));
    startPoll();
  };

  const doSwitch = (id: string) => { setDropOpen(false); if (id !== workspaceId) window.location.href = "/workspace/" + id; };

  const doCreate = async () => {
    if (!newName.trim()) return;
    try { const id = await createWorkspace(newName.trim(), "named"); setNewName(""); setShowNew(false); window.location.href = "/workspace/" + id; } catch (e) { console.error(e); }
  };

  const nodeClick = useCallback((id: string) => { setSelNode(nodes.find((x) => x.id === id) || null); }, [nodes]);

  const isEmpty = files.length === 0 && sta.status === "ready";

  const [sideOpen, setSideOpen] = useState(true);
  const sideRef = useRef<HTMLDivElement>(null);

  // Sidebar drag
  useEffect(() => {
    const el = sideRef.current; if (!el) return;
    let startX = 0, startY = 0, origX = 0, origY = 0;
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input")) return;
      el.setPointerCapture(e.pointerId);
      startX = e.clientX; startY = e.clientY;
      origX = el.offsetLeft; origY = el.offsetTop;
    };
    const onMove = (e: PointerEvent) => {
      if (!el.hasPointerCapture(e.pointerId)) return;
      el.style.left = (origX + e.clientX - startX) + "px";
      el.style.top = (origY + e.clientY - startY) + "px";
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    return () => { el.removeEventListener("pointerdown", onDown); el.removeEventListener("pointermove", onMove); };
  }, []);

  return (
    <div className="relative h-screen bg-bg overflow-hidden">
      {/* ═══ FLOATING SIDEBAR (overlay, draggable) ═══ */}
      {sideOpen && (
      <aside
        ref={sideRef}
        className="absolute top-3 left-3 z-30 w-60 max-h-[calc(100vh-24px)] flex flex-col rounded-lg border border-border shadow-lg overflow-hidden"
        style={{ backgroundColor: "rgba(255,255,255,0.94)", backdropFilter: "blur(12px)", touchAction: "none" }}>
        {/* workspace dropdown */}
        <div className="relative border-b border-border p-3">
          <button onClick={() => setDropOpen(!dropOpen)}
            className="w-full flex items-center justify-between rounded border border-border bg-bg px-3 py-2 text-sm text-text hover:border-accent transition-colors duration-200 active:scale-[0.98]">
            <span className="truncate font-medium" style={{ fontFamily: '"Noto Serif SC", serif' }}>{ws.name}</span>
            <svg className={"ml-1 h-4 w-4 text-muted transition-transform duration-200 " + (dropOpen ? "rotate-180" : "")}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {dropOpen && (
            <div className="absolute left-3 right-3 top-full z-30 mt-1 max-h-48 overflow-y-auto rounded border border-border bg-surface shadow-lg">
              {workspaces.map((w: Workspace) => (
                <div key={w.id} className={"flex items-center group " + (w.id === workspaceId ? "bg-accent/5" : "")}>
                  <button onClick={() => doSwitch(w.id)}
                    className={"flex-1 px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-bg " + (w.id === workspaceId ? "font-medium text-accent" : "text-text")}>
                    {w.name}</button>
                  <button
                    onClick={() => { if (confirm("删除工作区 \"" + w.name + "\"？所有数据将丢失。")) { deleteWorkspace(w.id).then(() => { setWorkspaces(prev => prev.filter(x => x.id !== w.id)); if (w.id === workspaceId) window.location.href = "/"; }); } }}
                    className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 transition-all">
                    删除</button>
                </div>
              ))}
              <div className="border-t border-border p-2">
                {showNew ? (
                  <div className="flex gap-1">
                    <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && doCreate()}
                      placeholder="新工作区名称" className="flex-1 rounded border border-border bg-bg px-2 py-1 text-xs focus:border-accent outline-none" />
                    <button onClick={doCreate} className="rounded bg-accent px-2 py-1 text-xs text-white hover:opacity-90 active:scale-95 transition-all" style={{ backgroundColor: "#2c3e6b" }}>创建</button>
                  </div>
                ) : (
                  <button onClick={() => setShowNew(true)} className="w-full px-3 py-2 text-left text-xs text-muted hover:text-accent transition-colors">+ 新建工作区</button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* search */}
        <div className="px-3 pt-3"><SearchBar /></div>

        {/* file list */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {files.length === 0 ? (
            <p className="text-xs text-muted text-center mt-8">暂无文件</p>
          ) : (
            <>
              <p className="mb-2 text-xs font-medium text-muted">文件 ({files.length})</p>
              <ul className="space-y-1">
                {files.map((f: FileEntry) => {
                  const fr = fileRes.find((x) => x.file_id === f.id);
                  // Default to "processing" when global status is processing but per-file results not yet available
                  const defaultR = sta.status === "processing" ? "processing" : sta.status === "ready" ? "ok" : "pending";
                  const r = fr ? (gType === "named" ? fr.result_named : fr.result_concept) : defaultR;
                  const isErr = r === "error";
                  const isOk = r === "ok";
                  const isBusy = r === "processing";
                  const label = isErr ? "失败" : isOk ? "完成" : isBusy ? "分析中" : "待分析";
                  const dotCls = isErr ? "bg-red-400" : isOk ? "bg-green-400" : isBusy ? "bg-amber-400 animate-pulse" : "bg-red-300";
                  const txtCls = isErr ? "text-red-500" : isOk ? "text-green-600" : isBusy ? "text-amber-600" : "text-red-400";
                  return (
                    <li key={f.id} className="group flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors hover:bg-bg">
                      <span className={"h-2 w-2 shrink-0 rounded-full " + dotCls} title={label} />
                      <span className={"flex-1 truncate " + txtCls}>{f.filename}</span>
                      <span className="text-[10px] text-muted mr-1 hidden group-hover:inline">{label}</span>
                      <button
                        disabled={isBusy}
                        onClick={() => { if (confirm("确定删除 " + f.filename + "？")) doDelete(f.id); }}
                        className={"text-[10px] px-1.5 py-0.5 rounded border transition-all " +
                          (isBusy ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600")}>
                        {isBusy ? "分析中" : "删除"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* Zoom controls + reset */}
        <div className="border-t border-border px-3 py-2 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted w-10">缩放</span>
            <input type="range" min="20" max="1000" defaultValue="50" id="zoom-slider"
              onChange={e => { const v = parseInt(e.target.value); (window as any).__graphZoom?.zoomTo(v); }}
              className="flex-1 h-1 accent-[#2c3e6b]" />
            <span className="text-xs text-muted w-10" id="zoom-label">50%</span>
          </div>
          <button onClick={() => (window as any).__graphZoom?.restart()}
            className="w-full rounded border border-border px-2 py-1 text-xs text-muted hover:bg-bg hover:text-text transition-colors">
            ↺ 重构图
          </button>
        </div>

        {/* bottom: upload + export */}
        <div className="border-t border-border p-3 space-y-2">
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="w-full rounded px-3 py-2 text-xs font-medium text-white hover:opacity-90 active:scale-[0.97] transition-all duration-150 disabled:opacity-50 disabled:cursor-wait"
            style={{ backgroundColor: "#2c3e6b" }}>{uploading ? "上传中..." : "+ 上传文件"}</button>
          <div className="flex gap-2"><ExportButton filename={ws.name} /></div>
          <button onClick={() => setSideOpen(false)}
            className="text-xs text-muted hover:text-text pt-1 transition-colors">— 收起</button>
        </div>
      </aside>
      )}

      {/* Toggle button when collapsed */}
      {!sideOpen && (
        <button onClick={() => setSideOpen(true)}
          className="absolute top-3 left-3 z-30 px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-text transition-colors"
          style={{ backgroundColor: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)" }}>
          ☰ 面板
        </button>
      )}

      {/* ═══ MAIN AREA (full screen) ═══ */}
      <main className="absolute inset-0 flex flex-col">
        {/* top bar: graph type toggle */}
        <div className="flex items-center justify-center border-b border-border bg-surface px-4 py-2">
          <div className="inline-flex rounded border border-border overflow-hidden text-xs">
            <button onClick={() => { setGType("named"); loadGraph("named"); }}
              className={"px-4 py-1.5 transition-colors duration-150 " + (gType === "named" ? "bg-accent text-white" : "bg-surface text-muted hover:bg-bg")}>命名实体</button>
            <button onClick={() => { setGType("concept"); loadGraph("concept"); }}
              className={"px-4 py-1.5 transition-colors duration-150 " + (gType === "concept" ? "bg-accent text-white" : "bg-surface text-muted hover:bg-bg")}>概念关系</button>
          </div>
        </div>

        {/* graph canvas (always mounted) + empty state overlay */}
        <div className="relative flex-1">
          <GraphCanvas nodes={nodes} edges={edges} onNodeClick={nodeClick} />
          <NodeDetail node={selNode} onClose={() => setSelNode(null)} />
          {isEmpty && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/60 backdrop-blur-[2px]">
              <div className="rounded-xl border-2 border-dashed border-border bg-surface/90 p-12 text-center max-w-sm shadow-sm">
                <p className="mb-2 text-lg font-medium text-text" style={{ fontFamily: '"Noto Serif SC", serif' }}>拖拽文件到此处开始分析</p>
                <p className="text-sm text-muted">支持 .txt .md .pdf .docx · 多文件合并分析 · 单文件上限 10MB</p>
              </div>
            </div>
          )}
        </div>

        {/* status bar */}
        <StatusBar status={sta.status} phase={sta.phase} progress={sta.progress}
          nodeCount={nodes.length} edgeCount={edges.length} errorMessage={sta.error_message} rawOutput={""} />
      </main>

      <input ref={fileRef} type="file" multiple accept=".txt,.md,.pdf,.docx" onChange={doUpload} className="hidden" />
    </div>
  );
}
