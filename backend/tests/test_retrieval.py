import uuid

import pytest
from sqlalchemy.dialects import postgresql

from app.chunks.retrieval import build_keyword_query, build_query

VECTOR = [0.1] * 1536


def test_refuses_to_run_without_space_id():
    with pytest.raises(TypeError):
        build_query(None, VECTOR)  # type: ignore[arg-type]
    with pytest.raises(TypeError):
        build_query("not-a-uuid", VECTOR)  # type: ignore[arg-type]


def test_query_is_always_filtered_by_space_id():
    space_id = uuid.uuid4()
    compiled = build_query(space_id, VECTOR).compile(dialect=postgresql.dialect())
    assert "chunks.space_id = %(space_id_1)s" in str(compiled)
    assert compiled.params["space_id_1"] == space_id


def test_query_only_reads_ready_enabled_documents_of_the_space():
    sql = str(build_query(uuid.uuid4(), VECTOR).compile(dialect=postgresql.dialect()))
    assert "documents.space_id = " in sql
    assert "documents.enabled IS true" in sql
    assert "documents.status = " in sql


def test_keyword_search_refuses_to_run_without_space_id():
    with pytest.raises(TypeError):
        build_keyword_query(None, "atp")  # type: ignore[arg-type]


def test_keyword_search_is_filtered_by_space_and_matches_typos():
    space_id = uuid.uuid4()
    sql = str(
        build_keyword_query(space_id, "atp").compile(dialect=postgresql.dialect())
    )
    assert "chunks.space_id = " in sql
    assert "documents.enabled IS true" in sql
    assert "<%" in sql  # trigram match, so a misspelled word still finds passages
    assert "websearch_to_tsquery" in sql
