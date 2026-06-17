from fastapi import APIRouter, HTTPException, Query, Request, Header
from db.lancedb_client import client as db
from db.models import SearchResponse
from services.embedder import get_embedder
from routes.auth import get_current_user

router = APIRouter(tags=["search"])


@router.get("/workspaces/{ws_id}/search", response_model=SearchResponse)
def semantic_search(
    ws_id: str,
    q: str = Query(..., min_length=1),
    authorization: str = Header(...),
    request: Request = None,
):
    get_current_user(authorization)

    snap = db.get_snapshot(ws_id, "named")
    if not snap:
        raise HTTPException(status_code=404, detail="No graph found for this workspace")

    if not q.strip() or not snap.embedding_cache:
        return SearchResponse(
            matched_nodes=[],
            subgraph_nodes=[],
            subgraph_edges=[],
        )

    embedder = request.app.state.embedder or get_embedder()
    query_vec = embedder.embed(q.strip())

    # 计算所有节点的余弦相似度
    scored = []
    for node in snap.nodes:
        node_vec = snap.embedding_cache.get(node.id)
        if node_vec:
            score = embedder.similarity(query_vec, node_vec)
            scored.append((node, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    top_k = scored[:5]

    if not top_k:
        return SearchResponse(
            matched_nodes=[],
            subgraph_nodes=[],
            subgraph_edges=[],
        )

    matched_ids = {n.id for n, _ in top_k}

    # 2-hop 邻居展开
    expand_ids = set(matched_ids)
    for _ in range(2):
        new_ids = set()
        for edge in snap.edges:
            if edge.source in expand_ids and edge.target not in expand_ids:
                new_ids.add(edge.target)
            if edge.target in expand_ids and edge.source not in expand_ids:
                new_ids.add(edge.source)
        expand_ids.update(new_ids)

    subgraph_nodes = [n for n in snap.nodes if n.id in expand_ids]
    subgraph_edges = [
        e for e in snap.edges
        if e.source in expand_ids and e.target in expand_ids
    ]

    return SearchResponse(
        matched_nodes=[n for n, _ in top_k],
        subgraph_nodes=subgraph_nodes,
        subgraph_edges=subgraph_edges,
    )
