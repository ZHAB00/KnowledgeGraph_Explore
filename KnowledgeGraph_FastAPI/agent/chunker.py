class Chunker:
    def __init__(self, max_chars: int = 12000, overlap: int = 300):
        self.max_chars = max_chars
        self.overlap = overlap

    def split(self, text: str) -> list[str]:
        if not text.strip():
            return []

        paragraphs = text.split("\n\n")
        chunks = []
        current = ""
        overlap_buffer = ""

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            if len(current) + len(para) + 2 <= self.max_chars:
                current = current + "\n\n" + para if current else para
            else:
                if current:
                    chunks.append(current)
                    overlap_buffer = current[-self.overlap:] if len(current) > self.overlap else current
                    current = overlap_buffer + "\n\n" + para if overlap_buffer else para
                else:
                    for i in range(0, len(para), self.max_chars - self.overlap):
                        chunk = para[i:i + self.max_chars]
                        chunks.append(chunk)
                    current = ""
                    overlap_buffer = ""

        if current.strip():
            chunks.append(current)

        return chunks if chunks else [text]
