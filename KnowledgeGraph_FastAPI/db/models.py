from __future__ import annotations
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import uuid4
from typing import Literal, Optional


def new_id() -> str:
    return uuid4().hex[:12]


def now() -> str:
    return datetime.utcnow().isoformat()


class User(BaseModel):
    id: str = Field(default_factory=new_id)
    username: str
    password_hash: str


class Workspace(BaseModel):
    id: str = Field(default_factory=new_id)
    user_id: str
    name: str
    entity_type: Literal["named", "concept"] = "named"
    status: Literal["processing", "ready", "error"] = "ready"
    created_at: str = Field(default_factory=now)


class FileRecord(BaseModel):
    id: str = Field(default_factory=new_id)
    workspace_id: str
    filename: str
    content: str
    uploaded_at: str = Field(default_factory=now)


class NodeModel(BaseModel):
    id: str
    label: str
    type: str
    metadata: dict = Field(default_factory=dict)


class EdgeModel(BaseModel):
    source: str
    target: str
    label: str
    weight: float = 1.0


class GraphSnapshot(BaseModel):
    id: str = Field(default_factory=new_id)
    workspace_id: str
    nodes: list[NodeModel] = Field(default_factory=list)
    edges: list[EdgeModel] = Field(default_factory=list)
    embedding_cache: dict[str, list[float]] = Field(default_factory=dict)
    created_at: str = Field(default_factory=now)


# ---- API request/response schemas ----

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str


class WorkspaceCreateRequest(BaseModel):
    name: str
    entity_type: Literal["named", "concept"] = "named"


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    entity_type: str
    status: str
    created_at: str
    file_count: int = 0


class ExtractRequest(BaseModel):
    entity_type: Literal["named", "concept"]


class ExtractResponse(BaseModel):
    job_id: str


class StatusResponse(BaseModel):
    status: str
    phase: str
    progress: float
    file_count: int = 0
    node_count_named: int = 0
    edge_count_named: int = 0
    node_count_concept: int = 0
    edge_count_concept: int = 0
    error_message: Optional[str] = None
    raw_output: Optional[str] = None


class GraphResponse(BaseModel):
    id: str
    workspace_id: str
    nodes: list[NodeModel]
    edges: list[EdgeModel]
    created_at: str


class SearchResponse(BaseModel):
    matched_nodes: list[NodeModel]
    subgraph_nodes: list[NodeModel]
    subgraph_edges: list[EdgeModel]
