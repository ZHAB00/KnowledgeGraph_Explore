import lancedb
import json
from config import LANCE_DB_PATH


class LanceDBClient:
    def __init__(self, path: str = LANCE_DB_PATH):
        self.db = lancedb.connect(path)
        self._init_tables()

    def _init_tables(self):
        existing = self.db.table_names()
        if "workspaces" not in existing:
            self.db.create_table("workspaces", [
                {"id": "", "user_id": "", "name": "", "entity_type": "named",
                 "status": "ready", "created_at": ""}
            ])
        if "files" not in existing:
            self.db.create_table("files", [
                {"id": "", "workspace_id": "", "filename": "", "content": "",
                 "uploaded_at": ""}
            ])
        if "snapshots" not in existing:
            self.db.create_table("snapshots", [
                {"id": "", "workspace_id": "", "nodes_json": "[]",
                 "edges_json": "[]", "embedding_cache_json": "{}", "created_at": ""}
            ])

    # ---- Workspaces ----
    def create_workspace(self, ws: "Workspace") -> "Workspace":
        tbl = self.db.open_table("workspaces")
        tbl.add([ws.model_dump()])
        return ws

    def get_workspace(self, ws_id: str) -> "Workspace | None":
        tbl = self.db.open_table("workspaces")
        results = tbl.search(ws_id).limit(1).to_list()
        if not results:
            return None
        return Workspace(**results[0])

    def list_workspaces(self, user_id: str) -> list["Workspace"]:
        tbl = self.db.open_table("workspaces")
        df = tbl.to_pandas()
        matches = df[df["user_id"] == user_id]
        return [Workspace(**row) for _, row in matches.iterrows()]

    def update_workspace_status(self, ws_id: str, status: str):
        self._update_field("workspaces", ws_id, {"status": status})

    def _update_field(self, table: str, record_id: str, updates: dict):
        tbl = self.db.open_table(table)
        df = tbl.to_pandas()
        mask = df["id"] == record_id
        if mask.any():
            for k, v in updates.items():
                df.loc[mask, k] = v
            self.db.drop_table(table)
            self.db.create_table(table, df)

    def delete_workspace(self, ws_id: str):
        for table_name in ["workspaces", "files", "snapshots"]:
            tbl = self.db.open_table(table_name)
            df = tbl.to_pandas()
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
        tbl.add([f.model_dump()])
        return f

    def list_files(self, ws_id: str) -> list["FileRecord"]:
        tbl = self.db.open_table("files")
        df = tbl.to_pandas()
        matches = df[df["workspace_id"] == ws_id]
        return [FileRecord(**row) for _, row in matches.iterrows()]

    # ---- Snapshots ----
    def save_snapshot(self, snap: "GraphSnapshot"):
        tbl = self.db.open_table("snapshots")
        df = tbl.to_pandas()
        df = df[df["workspace_id"] != snap.workspace_id]
        self.db.drop_table("snapshots")
        self.db.create_table("snapshots", df)
        # Re-open after recreate
        tbl = self.db.open_table("snapshots")
        row = {
            "id": snap.id,
            "workspace_id": snap.workspace_id,
            "nodes_json": json.dumps([n.model_dump() for n in snap.nodes], ensure_ascii=False),
            "edges_json": json.dumps([e.model_dump() for e in snap.edges], ensure_ascii=False),
            "embedding_cache_json": json.dumps(snap.embedding_cache, ensure_ascii=False),
            "created_at": snap.created_at,
        }
        tbl.add([row])

    def get_snapshot(self, ws_id: str) -> "GraphSnapshot | None":
        tbl = self.db.open_table("snapshots")
        df = tbl.to_pandas()
        matches = df[df["workspace_id"] == ws_id]
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
            id=row["id"],
            workspace_id=row["workspace_id"],
            nodes=nodes,
            edges=edges,
            embedding_cache=embedding_cache,
            created_at=row["created_at"],
        )


# Lazy imports to avoid circular deps
from db.models import Workspace, FileRecord, GraphSnapshot

client = LanceDBClient()
