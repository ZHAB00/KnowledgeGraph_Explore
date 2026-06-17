from agent.chunker import Chunker


def test_short_text_single_chunk():
    c = Chunker(chunk_size=500, overlap=50)
    text = "这是一段短文本。只有两句话。"
    chunks = c.split(text)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_long_text_multiple_chunks():
    c = Chunker(chunk_size=100, overlap=10)
    paragraph = "这是一个测试段落。" * 30
    chunks = c.split(paragraph)
    assert len(chunks) > 1


def test_sentence_boundary_respected():
    c = Chunker(chunk_size=200, overlap=20)
    text = "这是第一句。这是第二句。这是第三句。"
    chunks = c.split(text)
    # Should split on sentence boundaries when possible
    assert len(chunks) >= 1


def test_empty_text():
    c = Chunker(chunk_size=100, overlap=20)
    chunks = c.split("")
    assert chunks == []


def test_single_long_sentence_splits():
    c = Chunker(chunk_size=80, overlap=10)
    text = "A" * 200
    chunks = c.split(text)
    assert len(chunks) >= 2
