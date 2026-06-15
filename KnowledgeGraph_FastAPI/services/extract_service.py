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


async def run_extraction(workspace_id: str, entity_type: str):
    job_id = workspace_id
    _jobs[job_id] = {"status": "processing", "phase": "loading", "progress": 0.0}

    try:
        # Phase 1: 加载文件
        _jobs[job_id].update(phase="loading", progress=0.05)
        files = db.list_files(workspace_id)
        if not files:
            raise ValueError("No files in workspace")

        combined_text = "\n\n".join(f.content for f in files)
        db.update_workspace_status(workspace_id, "processing")

        # Phase 2: 分块
        _jobs[job_id].update(phase="chunking", progress=0.1)
        chunker = Chunker(max_chars=12000, overlap=300)
        chunks = chunker.split(combined_text)
        logger.info(f"Split into {len(chunks)} chunks for workspace {workspace_id}")

        # Phase 3: AI 抽取
        _jobs[job_id].update(phase="extracting", progress=0.2)
        provider = get_provider("deepseek")
        extractor = KnowledgeGraphExtractor(provider)
        results = extractor.extract_batch(chunks, entity_type)

        # Phase 4: 合并去重
        _jobs[job_id].update(phase="merging", progress=0.7)
        merged = Merger.merge(results)

        if not merged.get("nodes"):
            error_msg = merged.get("_error", "No entities found")
            raw = merged.get("_raw_output", "")
            _jobs[job_id] = {
                "status": "error", "phase": "done", "progress": 1.0,
                "error_message": error_msg, "raw_output": raw,
            }
            db.update_workspace_status(workspace_id, "error")
            return

        # Phase 5: Embedding
        _jobs[job_id].update(phase="embedding", progress=0.85)
        from services.embedder import get_embedder
        embedder = get_embedder()
        labels = [n["label"] for n in merged["nodes"]]
        vectors = await asyncio.to_thread(embedder.embed_batch, labels)
        embedding_cache = {
            merged["nodes"][i]["id"]: vectors[i]
            for i in range(len(labels))
        }

        # Phase 6: 保存
        _jobs[job_id].update(phase="saving", progress=0.95)
        nodes = [
            NodeModel(
                id=n["id"], label=n["label"],
                type=n.get("type", "unknown"),
                metadata=n.get("metadata", {}),
            )
            for n in merged["nodes"]
        ]
        edges = [
            EdgeModel(
                source=e["source"], target=e["target"],
                label=e["label"], weight=e.get("weight", 1.0),
            )
            for e in merged["edges"]
        ]

        snapshot = GraphSnapshot(
            workspace_id=workspace_id, nodes=nodes, edges=edges,
            embedding_cache=embedding_cache,
        )
        db.save_snapshot(snapshot)
        db.update_workspace_status(workspace_id, "ready")

        _jobs[job_id] = {"status": "ready", "phase": "done", "progress": 1.0}
        logger.info(f"Extraction complete for workspace {workspace_id}: {len(nodes)} nodes, {len(edges)} edges")

    except Exception as e:
        logger.exception(f"Extraction failed for workspace {workspace_id}")
        _jobs[job_id] = {
            "status": "error", "phase": "done", "progress": 1.0,
            "error_message": str(e),
        }
        db.update_workspace_status(workspace_id, "error")
