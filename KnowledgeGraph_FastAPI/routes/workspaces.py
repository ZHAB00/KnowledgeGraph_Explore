import asyncio
from fastapi import APIRouter, HTTPException, UploadFile, File, Header
from db.lancedb_client import client as db
from db.models import (
    Workspace, FileRecord, WorkspaceCreateRequest, WorkspaceResponse,
    ExtractRequest, ExtractResponse, StatusResponse, GraphResponse
)
from routes.auth import get_current_user
from services.file_parser import FileParser, UnsupportedFormatError
from services.extract_service import run_extraction, get_job_status

router = APIRouter(tags=["workspaces"])


def _auth(authorization: str = Header(...)) -> str:
    return get_current_user(authorization)


@router.post("/workspaces", response_model=dict)
def create_workspace(
    req: WorkspaceCreateRequest,
    authorization: str = Header(...),
):
    user = _auth(authorization)
    ws = Workspace(user_id=user, name=req.name, entity_type=req.entity_type)
    db.create_workspace(ws)
    return {"workspace_id": ws.id}


@router.post("/workspaces/{ws_id}/upload")
async def upload_file(
    ws_id: str,
    file: UploadFile = File(...),
    authorization: str = Header(...),
):
    _auth(authorization)
    ws = db.get_workspace(ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    data = await file.read()
    parser = FileParser()
    try:
        content = parser.parse_from_bytes(data, file.filename or "untitled.txt")
    except UnsupportedFormatError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format: .{e.extension}. Supported: {', '.join(parser.SUPPORTED)}",
        )

    fr = FileRecord(
        workspace_id=ws_id,
        filename=file.filename or "untitled.txt",
        content=content,
    )
    db.add_file(fr)
    return {"file_id": fr.id, "filename": fr.filename, "size_chars": len(content)}


@router.post("/workspaces/{ws_id}/extract", response_model=ExtractResponse)
def trigger_extract(
    ws_id: str,
    req: ExtractRequest,
    authorization: str = Header(...),
):
    _auth(authorization)
    ws = db.get_workspace(ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    db.update_workspace_status(ws_id, "processing")
    asyncio.create_task(run_extraction(ws_id, req.entity_type))
    return ExtractResponse(job_id=ws_id)


@router.get("/workspaces/{ws_id}/status", response_model=StatusResponse)
def get_status(ws_id: str, authorization: str = Header(...)):
    _auth(authorization)
    job = get_job_status(ws_id)
    if job:
        return StatusResponse(**job)
    ws = db.get_workspace(ws_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return StatusResponse(status=ws.status, phase="idle", progress=0.0)


@router.get("/workspaces/{ws_id}/graph", response_model=GraphResponse)
def get_graph(ws_id: str, authorization: str = Header(...)):
    _auth(authorization)
    snap = db.get_snapshot(ws_id)
    if not snap:
        raise HTTPException(status_code=404, detail="No graph found for this workspace")
    return snap


@router.get("/workspaces")
def list_workspaces(authorization: str = Header(...)):
    user = _auth(authorization)
    workspaces = db.list_workspaces(user)
    return [
        WorkspaceResponse(
            id=ws.id,
            name=ws.name,
            entity_type=ws.entity_type,
            status=ws.status,
            created_at=ws.created_at,
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
def create_demo(authorization: str = Header(...)):
    """创建 demo 工作区，预填示例文本。"""
    user = _auth(authorization)
    ws = Workspace(user_id=user, name="Demo: AI行业速览", entity_type="named")
    db.create_workspace(ws)

    import os
    demo_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "demo-data", "sample.txt"
    )
    try:
        with open(demo_path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        content = "Demo data not found."

    fr = FileRecord(workspace_id=ws.id, filename="sample.txt", content=content)
    db.add_file(fr)
    return {"workspace_id": ws.id}
