"""Add typo-tolerant and full-text search indexes on chunks.text

Revision ID: 0012
Revises: 0011
Create Date: 2026-11-16
"""

from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    # Trigram index: finds a word even when it is misspelled (word_similarity).
    op.execute(
        "CREATE INDEX ix_chunks_text_trgm ON chunks USING gin (text gin_trgm_ops)"
    )
    # Full-text index: stemmed words, ranked with ts_rank_cd.
    op.execute(
        "CREATE INDEX ix_chunks_text_fts ON chunks "
        "USING gin (to_tsvector('english', text))"
    )


def downgrade() -> None:
    op.execute("DROP INDEX ix_chunks_text_fts")
    op.execute("DROP INDEX ix_chunks_text_trgm")
