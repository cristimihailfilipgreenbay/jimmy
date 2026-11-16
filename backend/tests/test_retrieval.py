import uuid

import pytest
from sqlalchemy.dialects import postgresql

from app.chunks.retrieval import build_query

VECTOR = [0.1] * 1536


def test_refuses_to_run_without_space_id():
    with pytest.raises(TypeError):
        build_query(None, VECTOR)  # type: ignore[arg-type]
    with pytest.raises(TypeError):
        build_query("not-a-uuid", VECTOR)  # type: ignore[arg-type]


def test_query_is_always_filtered_by_space_id():
    space_id = uuid.uuid4()
    compiled = build_query(space_id, VECTOR).compile(dialect=postgresql.dialect())
    sql = str(compiled)
    assert "chunks.space_id = " in sql
    assert sql.count("space_id = ") >= 3  # chunks, documents and learned_material
    assert space_id in compiled.params.values()


def test_query_only_reads_ready_enabled_documents_of_the_space():
    sql = str(build_query(uuid.uuid4(), VECTOR).compile(dialect=postgresql.dialect()))
    assert "documents.space_id = " in sql
    assert "documents.enabled IS true" in sql
    assert "documents.status = " in sql


def test_learned_material_is_joined_inside_the_space_and_filtered_by_status():
    sql = str(
        build_query(
            uuid.uuid4(),
            VECTOR,
            source_types=("learned",),
            learned_status=("approved",),
        ).compile(dialect=postgresql.dialect())
    )
    assert "learned_material.space_id = " in sql
    assert "learned_material.status IN " in sql
