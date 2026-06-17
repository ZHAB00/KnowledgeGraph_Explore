from agent.extractor import KnowledgeGraphExtractor


def test_extract_empty_text():
    extractor = KnowledgeGraphExtractor(None)
    result = extractor.extract("", "named")
    assert result == {"nodes": [], "edges": []}


def test_extract_no_provider():
    extractor = KnowledgeGraphExtractor(None)
    result = extractor.extract("张三在北京。", "named")
    assert result == {"nodes": [], "edges": []}


def test_parse_json_plain():
    extractor = KnowledgeGraphExtractor(None)
    result = extractor._parse_json('{"nodes":[{"id":"n1","label":"A","type":"person"}],"edges":[]}')
    assert len(result["nodes"]) == 1
    assert result["nodes"][0]["label"] == "A"


def test_parse_json_with_markdown_fence():
    extractor = KnowledgeGraphExtractor(None)
    raw = '```json\n{"nodes":[{"id":"n1","label":"X","type":"person"}],"edges":[]}\n```'
    result = extractor._parse_json(raw)
    assert result["nodes"][0]["label"] == "X"


def test_reindex_adds_prefix():
    extractor = KnowledgeGraphExtractor(None)
    result = {
        "nodes": [{"id": "n1", "label": "A", "type": "person"}],
        "edges": [{"source": "n1", "target": "n2", "label": "x", "weight": 1.0}],
    }
    reindexed = extractor._reindex(result, "c0")
    assert reindexed["nodes"][0]["id"] == "c0_n1"
    assert reindexed["edges"][0]["source"] == "c0_n1"
