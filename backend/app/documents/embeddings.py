"""Embeddings through OpenRouter."""

import httpx

from app.config import get_settings

OPENROUTER_URL = "https://openrouter.ai/api/v1/embeddings"
BATCH = 64


class EmbeddingError(Exception):
    pass


def embed_texts(texts: list[str]) -> list[list[float]]:
    """One vector per text, in order, from the configured EMBEDDING_MODEL."""
    settings = get_settings()
    if not settings.openrouter_api_key:
        raise EmbeddingError("OPENROUTER_API_KEY is not set.")
    vectors: list[list[float]] = []
    with httpx.Client(timeout=60) as client:
        for start in range(0, len(texts), BATCH):
            batch = texts[start : start + BATCH]
            try:
                response = client.post(
                    OPENROUTER_URL,
                    headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
                    json={"model": settings.embedding_model, "input": batch},
                )
                response.raise_for_status()
                data = sorted(response.json()["data"], key=lambda d: d["index"])
            except (httpx.HTTPError, KeyError, ValueError) as exc:
                raise EmbeddingError(f"The embedding request failed: {exc}") from exc
            if len(data) != len(batch):
                raise EmbeddingError("The embedding service returned too few vectors.")
            vectors.extend(item["embedding"] for item in data)
    return vectors
