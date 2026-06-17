import os
# Must be set BEFORE importing sentence_transformers/torch
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
from sentence_transformers import SentenceTransformer
import numpy as np
import logging

logger = logging.getLogger(__name__)

_embedder: "Embedder | None" = None


class Embedder:
    def __init__(self, model_name: str = "BAAI/bge-small-zh"):
        # Use HF mirror for China users
        hf_endpoint = os.getenv("HF_ENDPOINT", "")
        if hf_endpoint:
            os.environ["HF_ENDPOINT"] = hf_endpoint
        self.model = SentenceTransformer(model_name)

    def embed(self, text: str) -> list[float]:
        vector = self.model.encode(text, normalize_embeddings=True)
        return vector.tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        vectors = self.model.encode(texts, normalize_embeddings=True)
        return vectors.tolist()

    def similarity(self, query_vec: list[float], target_vec: list[float]) -> float:
        return float(np.dot(query_vec, target_vec))


def get_embedder() -> Embedder | None:
    global _embedder
    if _embedder is None:
        try:
            _embedder = Embedder()
        except Exception as e:
            logger.warning(f"Failed to load embedding model: {e}. Semantic search will be unavailable.")
            _embedder = None
    return _embedder
