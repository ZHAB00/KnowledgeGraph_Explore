export interface Workspace {
  id: string;
  name: string;
  entity_type: "named" | "concept";
  status: "processing" | "ready" | "error";
  created_at: string;
  file_count: number;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  metadata: Record<string, string>;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  weight: number;
}

export interface GraphSnapshot {
  id: string;
  workspace_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  created_at: string;
}

export interface SearchResult {
  matched_nodes: GraphNode[];
  subgraph_nodes: GraphNode[];
  subgraph_edges: GraphEdge[];
}

export interface FileResult {
  file_id: string;
  filename: string;
  result_named: "pending" | "processing" | "ok" | "error";
  result_concept: "pending" | "processing" | "ok" | "error";
  error_named?: string;
  error_concept?: string;
}

export interface ExtractStatus {
  status: "processing" | "ready" | "error";
  phase: string;
  progress: number;
  error_message?: string;
  raw_output?: string;
  file_results?: FileResult[];
}
