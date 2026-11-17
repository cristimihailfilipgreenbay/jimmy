"""The models OpenRouter offers, with their list prices (dollars per token)."""

import logging
import time

import httpx

log = logging.getLogger(__name__)

MODELS_URL = "https://openrouter.ai/api/v1/models"
CACHE_SECONDS = 3600

_cache: tuple[float, list[dict]] | None = None


class ModelListUnavailable(Exception):
    pass


def _price(value) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def fetch_models() -> list[dict]:
    """Chat models sorted by id: `id`, `name`, `prompt` and `completion` prices.

    Kept for an hour, so an answer never waits on this list."""
    global _cache
    if _cache and time.monotonic() - _cache[0] < CACHE_SECONDS:
        return _cache[1]
    try:
        res = httpx.get(MODELS_URL, timeout=10)
        res.raise_for_status()
        data = res.json()["data"]
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise ModelListUnavailable(str(exc)) from exc
    models = []
    for item in data:
        outputs = (item.get("architecture") or {}).get("output_modalities") or ["text"]
        if "text" not in outputs or not item.get("id"):
            continue
        pricing = item.get("pricing") or {}
        models.append(
            {
                "id": item["id"],
                "name": item.get("name") or item["id"],
                "prompt": _price(pricing.get("prompt")),
                "completion": _price(pricing.get("completion")),
            }
        )
    models.sort(key=lambda m: m["id"])
    _cache = (time.monotonic(), models)
    return models


def prices_for(model: str) -> tuple[float | None, float | None]:
    """The model's (prompt, completion) prices, or (None, None) when unknown or the list
    cannot be fetched."""
    if not model:
        return None, None
    try:
        for m in fetch_models():
            if m["id"] == model:
                return m["prompt"], m["completion"]
    except ModelListUnavailable:
        log.warning("Could not fetch OpenRouter prices", exc_info=True)
    return None, None
