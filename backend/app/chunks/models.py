import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import CheckConstraint, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

# Must match EMBEDDING_MODEL's output size (docs/database.md). Changing it needs a
# migration and a full re-embed.
EMBEDDING_DIMENSIONS = 1536


class Chunk(Base):
    """A searchable passage. Only app.chunks.retrieval may query this table (ADR 0001)."""

    __tablename__ = "chunks"
    __table_args__ = (
        CheckConstraint(
            "source_type IN ('notes', 'library', 'learned')", name="source_type"
        ),
        # Notes and library chunks belong to a document, learned chunks to a Finding.
        CheckConstraint(
            "(source_type = 'learned' AND learned_material_id IS NOT NULL "
            "AND document_id IS NULL) OR "
            "(source_type <> 'learned' AND document_id IS NOT NULL "
            "AND learned_material_id IS NULL)",
            name="owner",
        ),
        Index("ix_chunks_space_id_source_type", "space_id", "source_type"),
        Index(
            "ix_chunks_embedding",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # NOT NULL: no chunk exists outside a Study Space.
    space_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("spaces.id", ondelete="CASCADE")
    )
    source_type: Mapped[str] = mapped_column(String(10))
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    learned_material_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("learned_material.id", ondelete="CASCADE"), index=True
    )
    chunk_index: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)
    page_start: Mapped[int | None] = mapped_column(Integer)
    page_end: Mapped[int | None] = mapped_column(Integer)
    section: Mapped[str | None] = mapped_column(String(300))
    token_count: Mapped[int] = mapped_column(Integer)
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIMENSIONS))
    embedding_model: Mapped[str] = mapped_column(String(100))
    embedding_dimensions: Mapped[int] = mapped_column(Integer)
