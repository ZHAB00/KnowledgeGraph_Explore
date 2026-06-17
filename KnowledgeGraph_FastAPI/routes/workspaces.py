import asyncio
from fastapi import APIRouter, HTTPException, UploadFile, File, Header, Query
from db.lancedb_client import client as db
from db.models import (
    Workspace, FileRecord, WorkspaceCreateRequest, WorkspaceResponse,
    ExtractResponse, StatusResponse, GraphResponse,
)
from routes.auth import get_current_user
from services.file_parser import FileParser, UnsupportedFormatError
from services.extract_service import run_extraction, get_job_status

router = APIRouter(tags=["workspaces"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _auth(authorization: str = Header(...)) -> str:
    return get_current_user(authorization)


@router.post("/workspaces", response_model=dict)
def create_workspace(
    req: WorkspaceCreateRequest,
    authorization: str = Header(...),
):
    user = _auth(authorization)
    ws = Workspace(user_id=user, name=req.name)
    db.create_workspace(ws)
    return {"workspace_id": ws.id}


@router.post("/workspaces/{ws_id}/upload")
async def upload_file(
    ws_id: str,
    file: UploadFile = File(...),
    authorization: str = Header(...),
):
    try:
        _auth(authorization)
        ws = db.get_workspace(ws_id)
        if not ws:
            raise HTTPException(status_code=404, detail="Workspace not found")

        data = await file.read()
        if len(data) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="文件过大，单文件上限 10MB")

        parser = FileParser()
        try:
            content = parser.parse_from_bytes(data, file.filename or "untitled.txt")
        except UnsupportedFormatError as e:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的文件格式: .{e.extension}。支持: {', '.join(parser.SUPPORTED)}",
            )

        fr = FileRecord(
            workspace_id=ws_id,
            filename=file.filename or "untitled.txt",
            content=content,
        )
        db.add_file(fr)
        # Uploaded → auto trigger extraction
        asyncio.create_task(run_extraction(ws_id))
        return {"file_id": fr.id, "filename": fr.filename, "size_chars": len(content)}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Upload error: {e}\n{traceback.format_exc()}")


@router.delete("/workspaces/{ws_id}/files/{file_id}")
async def delete_file(ws_id: str, file_id: str, authorization: str = Header(...)):
    _auth(authorization)
    ws = db.get_workspace(ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    await asyncio.to_thread(db.delete_file, file_id)

    remaining = await asyncio.to_thread(db.list_files, ws_id)
    if remaining:
        asyncio.create_task(run_extraction(ws_id))
    else:
        await asyncio.to_thread(db.delete_snapshots_for_workspace, ws_id)
        await asyncio.to_thread(db.update_workspace_status, ws_id, "ready")
    return {"deleted": file_id}


@router.get("/workspaces/{ws_id}/status", response_model=StatusResponse)
def get_status(ws_id: str, authorization: str = Header(...)):
    _auth(authorization)
    job = get_job_status(ws_id)
    if job:
        return StatusResponse(**job)
    ws = db.get_workspace(ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    files = db.list_files(ws_id)
    return StatusResponse(status=ws.status, phase="idle", progress=0.0, file_count=len(files))


@router.get("/workspaces/{ws_id}/graph", response_model=GraphResponse)
def get_graph(
    ws_id: str,
    type: str = Query(default="named", pattern="^(named|concept)$"),
    authorization: str = Header(...),
):
    _auth(authorization)
    snap = db.get_snapshot(ws_id, type)
    if not snap:
        # Return empty graph instead of 404 for cleaner UI
        from db.models import NodeModel, EdgeModel
        return GraphResponse(id="", workspace_id=ws_id, nodes=[], edges=[], created_at="")
    return snap


@router.get("/workspaces/{ws_id}/files")
def list_files(ws_id: str, authorization: str = Header(...)):
    _auth(authorization)
    files = db.list_files(ws_id)
    return [{"id": f.id, "filename": f.filename, "size_chars": len(f.content), "uploaded_at": f.uploaded_at} for f in files]


@router.get("/workspaces")
def list_workspaces(authorization: str = Header(...)):
    user = _auth(authorization)
    workspaces = db.list_workspaces(user)
    # Sort by created_at descending (newest first)
    workspaces.sort(key=lambda w: w.created_at, reverse=True)
    return [
        WorkspaceResponse(
            id=ws.id, name=ws.name, entity_type=ws.entity_type,
            status=ws.status, created_at=ws.created_at,
            file_count=len(db.list_files(ws.id)),
        )
        for ws in workspaces
    ]


@router.delete("/workspaces/{ws_id}")
def delete_workspace(ws_id: str, authorization: str = Header(...)):
    _auth(authorization)
    ws = db.get_workspace(ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    db.delete_workspace(ws_id)
    return {"deleted": ws_id}


@router.post("/demo")
async def create_demo(authorization: str = Header(...)):
    user = _auth(authorization)
    ws = Workspace(user_id=user, name="Demo: AI行业速览")
    db.create_workspace(ws)

    import os
    demo_path = os.path.join(os.path.dirname(__file__), "..", "..", "demo-data", "sample.txt")
    try:
        with open(demo_path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        content = "Demo data not found."

    fr = FileRecord(workspace_id=ws.id, filename="sample.txt", content=content)
    db.add_file(fr)
    asyncio.create_task(run_extraction(ws.id))
    return {"workspace_id": ws.id}
