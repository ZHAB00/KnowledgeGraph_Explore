import { Workspace, GraphSnapshot, SearchResult, ExtractStatus } from "./types";

const BASE = "/api";

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(username: string, password: string): Promise<string> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  const data = await res.json();
  localStorage.setItem("token", data.token);
  return data.token;
}

export async function createWorkspace(name: string, entityType: "named" | "concept"): Promise<string> {
  const res = await fetch(`${BASE}/workspaces`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ name, entity_type: entityType }),
  });
  const data = await res.json();
  return data.workspace_id;
}

export async function uploadFile(workspaceId: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/workspaces/${workspaceId}/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error("Upload failed");
}

export async function triggerExtract(workspaceId: string, entityType: "named" | "concept"): Promise<void> {
  await fetch(`${BASE}/workspaces/${workspaceId}/extract`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ entity_type: entityType }),
  });
}

export async function getExtractStatus(workspaceId: string): Promise<ExtractStatus> {
  const res = await fetch(`${BASE}/workspaces/${workspaceId}/status`, {
    headers: authHeaders(),
  });
  return res.json();
}

export async function getGraph(workspaceId: string): Promise<GraphSnapshot> {
  const res = await fetch(`${BASE}/workspaces/${workspaceId}/graph`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Graph not found");
  return res.json();
}

export async function semanticSearch(workspaceId: string, query: string): Promise<SearchResult> {
  const res = await fetch(
    `${BASE}/workspaces/${workspaceId}/search?q=${encodeURIComponent(query)}`,
    { headers: authHeaders() }
  );
  return res.json();
}

export async function listWorkspaces(): Promise<Workspace[]> {
  const res = await fetch(`${BASE}/workspaces`, { headers: authHeaders() });
  return res.json();
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
  await fetch(`${BASE}/workspaces/${workspaceId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
}

export async function createDemo(): Promise<string> {
  const res = await fetch(`${BASE}/demo`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await res.json();
  return data.workspace_id;
}

export function logout() {
  localStorage.removeItem("token");
}
