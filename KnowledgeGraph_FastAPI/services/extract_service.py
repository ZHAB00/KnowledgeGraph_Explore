import logging
import asyncio
import time
from db.lancedb_client import client as db
from db.models import GraphSnapshot, NodeModel, EdgeModel
from agent.chunker import Chunker
from agent.extractor import KnowledgeGraphExtractor
from agent.merger import Merger
from agent.providers import get_provider

# Console logger — use print so it always shows in PyCharm
log = print


def get_job_status(job_id: str) -> dict | None:
    return _jobs.get(job_id)


_jobs: dict[str, dict] = {}


def _extract_one_type_sync(text: str, entity_type: str) -> dict:
    """Sync: chunk text, call DeepSeek per chunk, merge. Returns {nodes, edges}."""
    etype_label = "命名实体" if entity_type == "named" else "概念关系"
    t0 = time.time()

    provider = get_provider("deepseek")
    chunker = Chunker()  # 6000 chars/chunk, 200 overlap — optimized for V4 Flash
    chunks = chunker.split(text)

    log(f"  [{etype_label}] 文本 {len(text)} 字符 → {len(chunks)} 块, 开始抽取...")

    extractor = KnowledgeGraphExtractor(provider)
    results = extractor.extract_batch(chunks, entity_type)

    chunk_ok = sum(1 for r in results if "_error" not in r)
    chunk_err = len(results) - chunk_ok
    log(f"  [{etype_label}] 抽取完成: {chunk_ok}/{len(chunks)} 块成功" +
        (f", {chunk_err} 块失败" if chunk_err else ""))

    merged = Merger.merge(results)

    if not merged.get("nodes"):
        raise ValueError(
            f"未提取到任何{etype_label}。"
            f"原始输出: {merged.get('_raw_output', 'N/A')[:300]}"
        )

    elapsed = time.time() - t0
    log(f"  [{etype_label}] 合并去重: {len(merged['nodes'])} 节点, {len(merged['edges'])} 边 (耗时 {elapsed:.1f}s)")

    return merged


def _build_snapshot(workspace_id: str, merged: dict) -> GraphSnapshot:
    from services.embedder import Embedder
    t0 = time.time()
    embedder = Embedder()
    labels = [n["label"] for n in merged["nodes"]]
    vectors = embedder.embed_batch(labels)
    elapsed = time.time() - t0
    log(f"  [Embedding] {len(labels)} 个节点向量化, 耗时 {elapsed:.1f}s")

    return GraphSnapshot(
        workspace_id=workspace_id,
        nodes=[NodeModel(id=n["id"], label=n["label"], type=n.get("type", "unknown"),
                metadata=n.get("metadata", {})) for n in merged["nodes"]],
        edges=[EdgeModel(source=e["source"], target=e["target"], label=e["label"],
                weight=e.get("weight", 1.0)) for e in merged["edges"]],
        embedding_cache={merged["nodes"][i]["id"]: vectors[i] for i in range(len(labels))},
    )


async def run_extraction(workspace_id: str):
    job_id = workspace_id
    existing = _jobs.get(job_id)
    if existing and existing.get("status") == "processing":
        log(f"[抽取] 工作区 {workspace_id} 正在抽取中，跳过")
        return
    _jobs[job_id] = {"status": "processing", "phase": "loading", "progress": 0.0}

    t_total = time.time()
    log(f"\n{'='*50}")
    log(f"[抽取] 工作区 {workspace_id} 开始")

    try:
        files = await asyncio.to_thread(db.list_files, workspace_id)
        if not files:
            log(f"[抽取] 没有文件，清空图谱")
            await asyncio.to_thread(db.delete_snapshots_for_workspace, workspace_id)
            await asyncio.to_thread(db.update_workspace_status, workspace_id, "ready")
            _jobs[job_id] = {"status": "ready", "phase": "done", "progress": 1.0,
                             "node_count_named": 0, "edge_count_named": 0,
                             "node_count_concept": 0, "edge_count_concept": 0}
            return

        log(f"[抽取] {len(files)} 个文件:")
        for f in files:
            log(f"  - {f.filename} ({len(f.content)} 字符)")

        await asyncio.to_thread(db.update_workspace_status, workspace_id, "processing")

        combined = "\n\n".join(f.content for f in files)
        log(f"[抽取] 合并文本: {len(combined)} 字符")

        # Parallel extraction in thread pool
        _jobs[job_id].update(phase="extracting", progress=0.1)
        t_extract = time.time()
        named_merged, concept_merged = await asyncio.gather(
            asyncio.to_thread(_extract_one_type_sync, combined, "named"),
            asyncio.to_thread(_extract_one_type_sync, combined, "concept"),
            return_exceptions=True,
        )
        log(f"[抽取] 两种模式并行耗时: {time.time() - t_extract:.1f}s")

        snap_named = snap_concept = None
        err_msgs = []

        if isinstance(named_merged, Exception):
            err_msgs.append(f"命名实体: {named_merged}")
            log(f"[抽取] 命名实体抽取失败: {named_merged}")
        else:
            _jobs[job_id].update(phase="saving", progress=0.7)
            snap_named = await asyncio.to_thread(_build_snapshot, workspace_id, named_merged)
            await asyncio.to_thread(db.save_snapshot, snap_named, "named")
            log(f"[抽取] 命名实体图谱已保存")

        if isinstance(concept_merged, Exception):
            err_msgs.append(f"概念关系: {concept_merged}")
            log(f"[抽取] 概念关系抽取失败: {concept_merged}")
        else:
            _jobs[job_id].update(phase="saving", progress=0.85)
            snap_concept = await asyncio.to_thread(_build_snapshot, workspace_id, concept_merged)
            await asyncio.to_thread(db.save_snapshot, snap_concept, "concept")
            log(f"[抽取] 概念关系图谱已保存")

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

        log(f"[抽取] 完成! 命名实体: {len(snap_named.nodes) if snap_named else 0}n/{len(snap_named.edges) if snap_named else 0}e, "
            f"概念关系: {len(snap_concept.nodes) if snap_concept else 0}n/{len(snap_concept.edges) if snap_concept else 0}e, "
            f"总耗时 {time.time() - t_total:.1f}s")
        log(f"{'='*50}\n")

    except Exception as e:
        log(f"[抽取] 失败: {e}")
        _jobs[job_id] = {"status": "error", "phase": "done", "progress": 1.0, "error_message": str(e)}
        await asyncio.to_thread(db.update_workspace_status, workspace_id, "error")
