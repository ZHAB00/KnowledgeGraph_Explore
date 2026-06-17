import lancedb
import json
import threading
import numpy as np
from config import LANCE_DB_PATH

_DUMMY_VEC = np.zeros(16, dtype=np.float32).tolist()


def _with_vec(row: dict) -> dict:
    row["vec"] = _DUMMY_VEC
    return row


class LanceDBClient:
    def __init__(self, path: str = LANCE_DB_PATH):
        self.db = lancedb.connect(path)
        self._lock = threading.Lock()
        self._init_tables()

    def _init_tables(self):
        existing = self.db.table_names()
        if "workspaces" not in existing:
            self.db.create_table("workspaces", [
                _with_vec({"id": "", "user_id": "", "name": "", "entity_type": "named",
                 "status": "ready", "created_at": ""})
            ])
        if "files" not in existing:
            self.db.create_table("files", [
                _with_vec({"id": "", "workspace_id": "", "filename": "", "content": "",
                 "uploaded_at": ""})
            ])
        if "snapshots" not in existing:
            self.db.create_table("snapshots", [
                _with_vec({"id": "", "workspace_id": "", "entity_type": "named",
                 "nodes_json": "[]", "edges_json": "[]",
                 "embedding_cache_json": "{}", "created_at": ""})
            ])

    # ---- Workspaces ----
    def create_workspace(self, ws: "Workspace") -> "Workspace":
        with self._lock:
            tbl = self.db.open_table("workspaces")
        tbl.add([_with_vec(ws.model_dump())])
        return ws

    def get_workspace(self, ws_id: str) -> "Workspace | None":
        tbl = self.db.open_table("workspaces")
        df = tbl.to_arrow().to_pandas()
        matches = df[df["id"] == ws_id]
        if matches.empty:
            return None
        return Workspace(**matches.iloc[0].to_dict())

    def list_workspaces(self, user_id: str) -> list["Workspace"]:
        tbl = self.db.open_table("workspaces")
        df = tbl.to_arrow().to_pandas()
        matches = df[df["user_id"] == user_id]
        return [Workspace(**row) for _, row in matches.iterrows()]

    def update_workspace_status(self, ws_id: str, status: str):
        self._update_field("workspaces", ws_id, {"status": status})

    def _update_field(self, table: str, record_id: str, updates: dict):
        tbl = self.db.open_table(table)
        df = tbl.to_arrow().to_pandas()
        mask = df["id"] == record_id
        if mask.any():
            for k, v in updates.items():
                df.loc[mask, k] = v
            self.db.drop_table(table)
            self.db.create_table(table, df)

    def delete_workspace(self, ws_id: str):
        for table_name in ["workspaces", "files", "snapshots"]:
            tbl = self.db.open_table(table_name)
            df = tbl.to_arrow().to_pandas()
            df = df[df["id"] != ws_id]
            if table_name == "files":
                df = df[df["workspace_id"] != ws_id]
            if table_name == "snapshots":
                df = df[df["workspace_id"] != ws_id]
            self.db.drop_table(table_name)
            self.db.create_table(table_name, df)

    # ---- Files ----
    def add_file(self, f: "FileRecord") -> "FileRecord":
        tbl = self.db.open_table("files")
        tbl.add([_with_vec(f.model_dump())])
        return f

    def list_files(self, ws_id: str) -> list["FileRecord"]:
        tbl = self.db.open_table("files")
        df = tbl.to_arrow().to_pandas()
        matches = df[df["workspace_id"] == ws_id]
        return [FileRecord(**row) for _, row in matches.iterrows()]

    def delete_file(self, file_id: str):
        tbl = self.db.open_table("files")
        df = tbl.to_arrow().to_pandas()
        df = df[df["id"] != file_id]
        self.db.drop_table("files")
        self.db.create_table("files", df)

    def delete_files_for_workspace(self, ws_id: str):
        tbl = self.db.open_table("files")
        df = tbl.to_arrow().to_pandas()
        df = df[df["workspace_id"] != ws_id]
        self.db.drop_table("files")
        self.db.create_table("files", df)

    # ---- Snapshots ----
    def save_snapshot(self, snap: "GraphSnapshot", entity_type: str = "named"):
        tbl = self.db.open_table("snapshots")
        df = tbl.to_arrow().to_pandas()
        # Remove old snapshot of same type for this workspace
        df = df[~((df["workspace_id"] == snap.workspace_id) & (df["entity_type"] == entity_type))]
        self.db.drop_table("snapshots")
        self.db.create_table("snapshots", df)
        tbl = self.db.open_table("snapshots")
        row = {
            "id": snap.id,
            "workspace_id": snap.workspace_id,
            "entity_type": entity_type,
            "nodes_json": json.dumps([n.model_dump() for n in snap.nodes], ensure_ascii=False),
            "edges_json": json.dumps([e.model_dump() for e in snap.edges], ensure_ascii=False),
            "embedding_cache_json": json.dumps(snap.embedding_cache, ensure_ascii=False),
            "created_at": snap.created_at,
        }
        tbl.add([_with_vec(row)])

    def get_snapshot(self, ws_id: str, entity_type: str = "named") -> "GraphSnapshot | None":
        tbl = self.db.open_table("snapshots")
        df = tbl.to_arrow().to_pandas()
        matches = df[(df["workspace_id"] == ws_id) & (df["entity_type"] == entity_type)]
        if matches.empty:
            return None
        row = matches.iloc[-1].to_dict()
        nodes_data = json.loads(row["nodes_json"])
        edges_data = json.loads(row["edges_json"])
        embedding_cache = json.loads(row["embedding_cache_json"])
        from db.models import NodeModel, EdgeModel
        nodes = [NodeModel(**n) for n in nodes_data]
        edges = [EdgeModel(**e) for e in edges_data]
        return GraphSnapshot(
            id=row["id"], workspace_id=row["workspace_id"],
            nodes=nodes, edges=edges, embedding_cache=embedding_cache,
            created_at=row["created_at"],
        )

    def delete_snapshots_for_workspace(self, ws_id: str):
        tbl = self.db.open_table("snapshots")
        df = tbl.to_arrow().to_pandas()
        df = df[df["workspace_id"] != ws_id]
        self.db.drop_table("snapshots")
        self.db.create_table("snapshots", df)


# Lazy imports to avoid circular deps
from db.models import Workspace, FileRecord, GraphSnapshot

_client: LanceDBClient | None = None


def get_client() -> LanceDBClient:
    global _client
    if _client is None:
        _client = LanceDBClient()
    return _client

# Restore module-level client singleton
client = get_client()
