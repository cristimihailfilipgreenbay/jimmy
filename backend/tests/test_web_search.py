"""Wikipedia and Tavily lookups (mock HTTP) and the tools that turn them into Findings."""

from unittest.mock import patch

import httpx
import pytest

from app.chat.citations import check_answer
from app.chat.prompt import build_prompt
from app.chat.tools import RunSources, make_search_web, make_search_wikipedia
from app.chat.web import LookupFailed, Page, search_tavily, search_wikipedia
from app.config import get_settings

WIKI = {
    "query": {
        "pages": {
            "2": {
                "index": 2,
                "title": "Krebs cycle",
                "fullurl": "https://en.wikipedia.org/wiki/Krebs_cycle",
                "extract": "A series of reactions.",
            },
            "1": {
                "index": 1,
                "title": "Citric acid",
                "fullurl": "https://en.wikipedia.org/wiki/Citric_acid",
                "extract": "A weak organic acid.",
            },
            "3": {"index": 3, "title": "Empty", "fullurl": "x", "extract": "  "},
        }
    }
}


def _client(handler) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_wikipedia_pages_come_back_in_search_order_without_empty_ones():
    client = _client(lambda request: httpx.Response(200, json=WIKI))
    pages = search_wikipedia("krebs", client)
    assert [p.title for p in pages] == ["Citric acid", "Krebs cycle"]
    assert pages[0].domain == "en.wikipedia.org"


def test_wikipedia_with_no_hits_is_an_empty_list():
    client = _client(lambda request: httpx.Response(200, json={"batchcomplete": ""}))
    assert search_wikipedia("zzzz", client) == []


def test_upstream_error_becomes_lookup_failed():
    client = _client(lambda request: httpx.Response(503))
    with pytest.raises(LookupFailed):
        search_wikipedia("krebs", client)


def test_tavily_needs_a_key(monkeypatch):
    monkeypatch.setattr(get_settings(), "tavily_api_key", "")
    with pytest.raises(LookupFailed):
        search_tavily("krebs", _client(lambda r: httpx.Response(200, json={})))


def test_tavily_sends_the_key_and_reads_results(monkeypatch):
    monkeypatch.setattr(get_settings(), "tavily_api_key", "k")
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["auth"] = request.headers["authorization"]
        return httpx.Response(
            200,
            json={
                "results": [
                    {"title": "T", "url": "https://www.site.org/a", "content": "text"},
                    {"title": "No content", "url": "https://x.org", "content": ""},
                ]
            },
        )

    pages = search_tavily("q", _client(handler))
    assert seen["auth"] == "Bearer k"
    assert [(p.title, p.domain) for p in pages] == [("T", "site.org")]


PAGES = [
    Page("Citric acid", "https://en.wikipedia.org/wiki/Citric_acid", "A weak acid."),
    Page("Krebs cycle", "https://en.wikipedia.org/wiki/Krebs_cycle", "Reactions."),
]


def test_wikipedia_tool_numbers_findings_once_and_labels_them_web():
    sources = RunSources()
    with patch("app.chat.tools.search_wikipedia", return_value=PAGES):
        tool = make_search_wikipedia(sources)
        first = tool.invoke({"query": "krebs"})
        again = tool.invoke({"query": "krebs"})
    assert first.startswith("[1] (Citric acid, en.wikipedia.org)")
    assert "[2] (Krebs cycle" in first
    assert again == first  # the same page keeps its number
    assert sources.ids == {1, 2}
    finding = sources.citations[1]
    assert finding.source_type == "wikipedia"
    assert finding.url == "https://en.wikipedia.org/wiki/Citric_acid"
    assert finding.fetched_at
    assert check_answer("It is an acid. [1]", sources.ids) == []


def test_failed_search_tells_the_tutor_instead_of_raising():
    with patch("app.chat.tools.search_tavily", side_effect=LookupFailed("HTTPError")):
        tool = make_search_web(RunSources())
        result = tool.invoke({"query": "q"})
    assert result.startswith("The search failed")


def test_prompt_lists_only_the_tools_the_run_has():
    plain = build_prompt()
    assert "search_wikipedia" not in plain and "search_web" not in plain
    with_web = build_prompt(library=True, wikipedia=True, web=True)
    assert "`search_wikipedia`" in with_web and "`search_web`" in with_web
    assert "5. Write the answer" in with_web
