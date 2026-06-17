from langchain.text_splitter import RecursiveCharacterTextSplitter


class Chunker:
    """语义感知的文本分块器。优先在段落、句子边界切断，保持语义完整性。"""

    def __init__(self, chunk_size: int = 6000, overlap: int = 200):
        """
        chunk_size: 每块最大 token 数（approx，中文约 1 char ≈ 0.5 token）
        overlap: 块间重叠 token 数
        """
        self.splitter = RecursiveCharacterTextSplitter(
            separators=[
                "\n\n",     # 段落边界（最高优先级）
                "\n",       # 换行
                "。",       # 中文句号
                "！",       # 中文感叹号
                "？",       # 中文问号
                "；",       # 中文分号
                ". ",       # 英文句号
                "! ",       # 英文感叹号
                "? ",       # 英文问号
                "; ",       # 英文分号
                "，",       # 中文逗号
                ", ",       # 英文逗号
                " ",        # 空格
                "",         # 字符级（最后手段）
            ],
            chunk_size=chunk_size,
            chunk_overlap=overlap,
            length_function=len,  # 用字符数估算
            keep_separator=True,  # 保留分隔符，不丢失语义标记
        )

    def split(self, text: str) -> list[str]:
        if not text.strip():
            return []
        chunks = self.splitter.split_text(text)
        return chunks if chunks else [text]
