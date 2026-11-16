import uuid

from app.chat.agent import build_agent
from app.chat.prompt import build_prompt
from app.chat.tools import RunSources
from app.documents.extract import Page
from app.library.ingest import book_pages


def _tool_names(library: bool) -> set[str]:
    agent = build_agent(uuid.uuid4(), RunSources(), model=_FakeChat(), library=library)
    return set(agent.nodes["tools"].bound.tools_by_name)


def _FakeChat():
    from langchain_core.language_models.fake_chat_models import GenericFakeChatModel

    class Fake(GenericFakeChatModel):
        def bind_tools(self, tools, **kwargs):
            return self

    return Fake(messages=iter([]))


def test_book_pages_use_the_books_own_numbers():
    pages = [Page(1, "a"), Page(2, "b")]
    assert [p.number for p in book_pages(pages, 235)] == [235, 236]
    assert [p.text for p in book_pages(pages, 235)] == ["a", "b"]


def test_library_tool_is_offered_only_when_the_space_switch_is_on():
    assert _tool_names(False) == {"search_notes"}
    assert _tool_names(True) == {"search_notes", "search_library"}


def test_prompt_mentions_the_library_only_when_it_is_on():
    assert "search_library" not in build_prompt(False)
    assert "search_library" in build_prompt(True)
