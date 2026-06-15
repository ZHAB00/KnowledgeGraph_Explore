from services.file_parser import FileParser, UnsupportedFormatError


def test_parse_txt():
    parser = FileParser()
    content = "这是一段测试文本"
    result = parser.parse_from_bytes(content.encode("utf-8"), "test.txt")
    assert result == "这是一段测试文本"


def test_parse_md():
    parser = FileParser()
    content = "# 标题\n\n正文内容"
    result = parser.parse_from_bytes(content.encode("utf-8"), "test.md")
    assert "# 标题" in result
    assert "正文内容" in result


def test_unsupported_format():
    parser = FileParser()
    try:
        parser.parse_from_bytes(b"fake", "test.xyz")
        assert False, "should raise"
    except UnsupportedFormatError as e:
        assert "xyz" in str(e)


def test_empty_txt():
    parser = FileParser()
    result = parser.parse_from_bytes(b"", "empty.txt")
    assert result == ""
