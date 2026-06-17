import logging
import asyncio
from db.lancedb_client import client as db
from db.models import GraphSnapshot, NodeModel, EdgeModel
from agent.chunker import Chunker
from agent.extractor import KnowledgeGraphExtractor
from agent.merger import Merger
from agent.providers import get_provider

logger = logging.getLogger(__name__)

_jobs: dict[str, dict] = {}


def get_job_status(job_id: str) -> dict | None:
    return _jobs.get(job_id)


def _extract_one_type_sync(text: str, entity_type: str) -> dict:
    """Sync: chunk text, call DeepSeek per chunk, merge. Returns {nodes, edges}."""
    provider = get_provider("deepseek")
    extractor = KnowledgeGraphExtractor(provider)
    chunker = Chunker(chunk_size=1500, overlap=150)
    chunks = chunker.split(text)
    results = extractor.extract_batch(chunks, entity_type)
    merged = Merger.merge(results)
    if not merged.get("nodes"):
        raise ValueError(
            f"未提取到任何{'命名实体' if entity_type == 'named' else '概念关系'}。"
            f"原始输出: {merged.get('_raw_output', 'N/A')[:300]}"
        )
    return merged


def _build_snapshot(workspace_id: str, merged: dict) -> GraphSnapshot:
    from services.embedder import Embedder
    embedder = Embedder()
    labels = [n["label"] for n in merged["nodes"]]
    vectors = embedder.embed_batch(labels)
    embedding_cache = {merged["nodes"][i]["id"]: vectors[i] for i in range(len(labels))}
    return GraphSnapshot(
        workspace_id=workspace_id,
        nodes=[NodeModel(id=n["id"], label=n["label"], type=n.get("type", "unknown"),
                metadata=n.get("metadata", {})) for n in merged["nodes"]],
        edges=[EdgeModel(source=e["source"], target=e["target"], label=e["label"],
                weight=e.get("weight", 1.0)) for e in merged["edges"]],
        embedding_cache=embedding_cache,
    )


async def run_extraction(workspace_id: str):
    job_id = workspace_id
    existing = _jobs.get(job_id)
    if existing and existing.get("status") == "processing":
        logger.info(f"Extraction already running for {workspace_id}, skipping")
        return
    _jobs[job_id] = {"status": "processing", "phase": "loading", "progress": 0.0}

    try:
        files = await asyncio.to_thread(db.list_files, workspace_id)
        if not files:
            await asyncio.to_thread(db.delete_snapshots_for_workspace, workspace_id)
            await asyncio.to_thread(db.update_workspace_status, workspace_id, "ready")
            _jobs[job_id] = {"status": "ready", "phase": "done", "progress": 1.0,
                             "node_count_named": 0, "edge_count_named": 0,
                             "node_count_concept": 0, "edge_count_concept": 0}
            return

        await asyncio.to_thread(db.update_workspace_status, workspace_id, "processing")

        # Merge all file contents into one text
        combined = "\n\n".join(f.content for f in files)

        # Run named + concept extraction in parallel thread pool
        _jobs[job_id].update(phase="extracting", progress=0.1)
        named_merged, concept_merged = await asyncio.gather(
            asyncio.to_thread(_extract_one_type_sync, combined, "named"),
            asyncio.to_thread(_extract_one_type_sync, combined, "concept"),
            return_exceptions=True,
        )

        snap_named = snap_concept = None
        err_msgs = []

        if isinstance(named_merged, Exception):
            err_msgs.append(f"命名实体: {named_merged}")
            logger.error(f"Named extraction failed: {named_merged}")
        else:
            _jobs[job_id].update(phase="saving", progress=0.7)
            snap_named = await asyncio.to_thread(_build_snapshot, workspace_id, named_merged)
            await asyncio.to_thread(db.save_snapshot, snap_named, "named")

        if isinstance(concept_merged, Exception):
            err_msgs.append(f"概念关系: {concept_merged}")
            logger.error(f"Concept extraction failed: {concept_merged}")
        else:
            _jobs[job_id].update(phase="saving", progress=0.85)
            snap_concept = await asyncio.to_thread(_build_snapshot, workspace_id, concept_merged)
            await asyncio.to_thread(db.save_snapshot, snap_concept, "concept")

        if snap_named is None and snap_concept is None:
            raise ValueError("两种抽取模式均失败: " + "; ".join(err_msgs))

        await asyncio.to_thread(db.update_workspace_status, workspace_id, "ready")

        _jobs[job_id] = {
            "status": "ready", "phase": "done", "progress": 1.0,
            "node_count_named": len(snap_named.nodes) if snap_named else 0,
            "edge_count_named": len(snap_named.edges) if snap_named else 0,
            "node_count_concept": len(snap_concept.nodes) if snap_concept else 0,
            "edge_count_concept": len(snap_concept.edges) if snap_concept else 0,
        }

    except Exception as e:
        logger.exception(f"Extraction failed for {workspace_id}")
        _jobs[job_id] = {"status": "error", "phase": "done", "progress": 1.0, "error_message": str(e)}
        await asyncio.to_thread(db.update_workspace_status, workspace_id, "error")
