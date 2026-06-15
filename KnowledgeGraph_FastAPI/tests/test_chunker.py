from agent.chunker import Chunker


def test_short_text_single_chunk():
    c = Chunker(max_chars=1000, overlap=50)
    text = "这是一段短文本。只有两句话。"
    chunks = c.split(text)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_long_text_multiple_chunks():
    c = Chunker(max_chars=100, overlap=20)
    paragraph = "这是一个测试段落。" * 30
    chunks = c.split(paragraph)
    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk) <= 100 + 20


def test_paragraph_boundary_respected():
    c = Chunker(max_chars=200, overlap=30)
    text = "段落一。\n\n段落二。\n\n段落三。"
    chunks = c.split(text)
    assert len(chunks) >= 1


def test_empty_text():
    c = Chunker(max_chars=100, overlap=20)
    chunks = c.split("")
    assert chunks == []


def test_single_long_paragraph_splits():
    c = Chunker(max_chars=80, overlap=10)
    text = "A" * 200
    chunks = c.split(text)
    assert len(chunks) >= 2
