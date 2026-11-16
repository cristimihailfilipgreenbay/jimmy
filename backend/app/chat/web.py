"""Web lookups for the Tutor: Wikipedia and Tavily. Plain HTTP, no model, no database.

Each function returns a list of `Page`s, or raises `LookupFailed` with a message
the Tutor can read. What comes back is a Finding: text from outside, treated as data.
"""

from dataclasses import dataclass
from urllib.parse import urlparse

import httpx

from app.config import get_settings

WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"
TAVILY_API = "https://api.tavily.com/search"
RESULTS = 3
# One passage per page; long enough to answer from, short enough to keep the prompt small.
MAX_CHARS = 1500
TIMEOUT = 10.0
HEADERS = {"User-Agent": "JimmyStudyTutor/0.1 (local study tool)"}


class LookupFailed(Exception):
    pass


@dataclass(frozen=True)
class Page:
    title: str
    url: str
    text: str

    @property
    def domain(self) -> str:
        return urlparse(self.url).netloc.removeprefix("www.")


def search_wikipedia(query: str, client: httpx.Client | None = None) -> list[Page]:
    params = {
        "action": "query",
        "format": "json",
        "generator": "search",
        "gsrsearch": query,
        "gsrlimit": RESULTS,
        "prop": "extracts|info",
        "exintro": 1,
        "explaintext": 1,
        "exchars": MAX_CHARS,
        "exlimit": RESULTS,
        "inprop": "url",
    }
    data = _request("get", WIKIPEDIA_API, client, params=params)
    pages = (data.get("query") or {}).get("pages") or {}
    ranked = sorted(pages.values(), key=lambda p: p.get("index", 0))
    return [
        Page(p["title"], p["fullurl"], p["extract"].strip())
        for p in ranked
        if p.get("extract", "").strip() and p.get("fullurl")
    ]


def search_tavily(query: str, client: httpx.Client | None = None) -> list[Page]:
    key = get_settings().tavily_api_key
    if not key:
        raise LookupFailed("TAVILY_API_KEY is not set.")
    body = {"query": query, "max_results": RESULTS, "search_depth": "basic"}
    data = _request(
        "post",
        TAVILY_API,
        client,
        json=body,
        headers={**HEADERS, "Authorization": f"Bearer {key}"},
    )
    return [
        Page(r.get("title") or r["url"], r["url"], r["content"].strip()[:MAX_CHARS])
        for r in data.get("results", [])
        if r.get("url") and r.get("content", "").strip()
    ]


def _request(method: str, url: str, client: httpx.Client | None, **kwargs) -> dict:
    kwargs.setdefault("headers", HEADERS)
    try:
        if client is None:
            with httpx.Client(timeout=TIMEOUT) as own:
                response = own.request(method, url, **kwargs)
        else:
            response = client.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise LookupFailed(type(exc).__name__) from exc
