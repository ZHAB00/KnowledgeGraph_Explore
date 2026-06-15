"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { getGraph, getExtractStatus, triggerExtract, listWorkspaces } from "@/lib/api";
import type { Workspace, GraphNode, GraphEdge } from "@/lib/types";
import GraphCanvas from "@/components/GraphCanvas";
import Sidebar from "@/components/Sidebar";
import NodeDetail from "@/components/NodeDetail";
import StatusBar from "@/components/StatusBar";

const DEFAULT_WORKSPACE: Workspace = {
  id: "", name: "加载中...", entity_type: "named",
  status: "ready", created_at: "", file_count: 0,
};

export default function WorkspacePage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [workspace, setWorkspace] = useState<Workspace>({ ...DEFAULT_WORKSPACE, id: workspaceId });
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [status, setStatus] = useState("loading");
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [rawOutput, setRawOutput] = useState("");

  const loadGraph = useCallback(async () => {
    try {
      const snap = await getGraph(workspaceId);
      setNodes(snap.nodes);
      setEdges(snap.edges);
    } catch { /* graph not ready yet */ }
  }, [workspaceId]);

  const loadWorkspace = useCallback(async () => {
    try {
      const wss = await listWorkspaces();
      const ws = wss.find((w) => w.id === workspaceId);
      if (ws) setWorkspace(ws);
    } catch { /* ignore */ }
  }, [workspaceId]);

  useEffect(() => {
    loadWorkspace();
    loadGraph();

    const interval = setInterval(async () => {
      try {
        const st = await getExtractStatus(workspaceId);
        setStatus(st.status);
        setPhase(st.phase);
        setProgress(st.progress);
        setErrorMessage(st.error_message || "");
        setRawOutput(st.raw_output || "");
        if (st.status === "ready" || st.status === "error") {
          loadGraph();
          loadWorkspace();
          if (st.status === "ready") clearInterval(interval);
        }
      } catch { /* ignore */ }
    }, 2000);

    return () => clearInterval(interval);
  }, [workspaceId, loadGraph, loadWorkspace]);

  const handleReextract = useCallback(async () => {
    if (!workspace) return;
    await triggerExtract(workspaceId, workspace.entity_type as "named" | "concept");
    setStatus("processing");
    setPhase("extracting");
    setProgress(0);
  }, [workspaceId, workspace]);

  const handleNodeClick = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    setSelectedNode(node || null);
  }, [nodes]);

  return (
    <div className="relative flex h-screen flex-col">
      <div className="relative flex-1">
        <Sidebar
          workspace={workspace}
          workspaceId={workspaceId}
          onEntityTypeChange={async (t) => {
            await triggerExtract(workspaceId, t);
            setStatus("processing");
          }}
          onReextract={handleReextract}
        />
        <GraphCanvas nodes={nodes} edges={edges} onNodeClick={handleNodeClick} />
        <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />
      </div>
      <StatusBar
        status={status} phase={phase} progress={progress}
        nodeCount={nodes.length} edgeCount={edges.length}
        errorMessage={errorMessage} rawOutput={rawOutput}
      />
    </div>
  );
}
