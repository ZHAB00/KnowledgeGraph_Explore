from agent.merger import Merger


def test_merge_deduplicates_similar_nodes():
    results = [
        {
            "nodes": [
                {"id": "c0_n1", "label": "张三", "type": "person", "metadata": {}},
                {"id": "c0_n2", "label": "北京", "type": "location", "metadata": {}},
            ],
            "edges": [
                {"source": "c0_n1", "target": "c0_n2", "label": "住在", "weight": 1.0},
            ],
        },
        {
            "nodes": [
                {"id": "c1_n1", "label": "张三", "type": "person", "metadata": {}},
                {"id": "c1_n2", "label": "上海", "type": "location", "metadata": {}},
            ],
            "edges": [
                {"source": "c1_n1", "target": "c1_n2", "label": "工作", "weight": 1.0},
            ],
        },
    ]
    merged = Merger.merge(results)
    labels = [n["label"] for n in merged["nodes"]]
    assert labels.count("张三") == 1
    assert len(merged["nodes"]) == 3
    assert len(merged["edges"]) == 2


def test_merge_combines_edge_weights():
    results = [
        {
            "nodes": [
                {"id": "c0_n1", "label": "A", "type": "person", "metadata": {}},
                {"id": "c0_n2", "label": "B", "type": "person", "metadata": {}},
            ],
            "edges": [
                {"source": "c0_n1", "target": "c0_n2", "label": "认识", "weight": 1.0},
            ],
        },
        {
            "nodes": [
                {"id": "c1_n1", "label": "A", "type": "person", "metadata": {}},
                {"id": "c1_n2", "label": "B", "type": "person", "metadata": {}},
            ],
            "edges": [
                {"source": "c1_n1", "target": "c1_n2", "label": "认识", "weight": 1.0},
            ],
        },
    ]
    merged = Merger.merge(results)
    assert len(merged["edges"]) == 1
    assert merged["edges"][0]["weight"] == 2.0


def test_merge_preserves_unique_nodes():
    results = [
        {
            "nodes": [
                {"id": "c0_n1", "label": "独有实体", "type": "concept", "metadata": {}},
            ],
            "edges": [],
        },
    ]
    merged = Merger.merge(results)
    assert len(merged["nodes"]) == 1
    assert merged["nodes"][0]["label"] == "独有实体"


def test_merge_renumbers_nodes():
    results = [
        {
            "nodes": [
                {"id": "old_id_1", "label": "X", "type": "person", "metadata": {}},
            ],
            "edges": [],
        },
    ]
    merged = Merger.merge(results)
    assert merged["nodes"][0]["id"] == "n1"


def test_merge_skips_error_results():
    results = [
        {"_error": "failed", "_raw_output": "{}"},
        {
            "nodes": [{"id": "ok", "label": "OK", "type": "person", "metadata": {}}],
            "edges": [],
        },
    ]
    merged = Merger.merge(results)
    assert len(merged["nodes"]) == 1
