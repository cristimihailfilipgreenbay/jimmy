from alembic import context

from app.db import Base, make_engine

target_metadata = Base.metadata

# Tables created and maintained by the LangGraph Postgres checkpointer.
# Alembic must not try to drop them during autogenerate (docs/database.md).
CHECKPOINT_TABLES = {
    "checkpoints",
    "checkpoint_blobs",
    "checkpoint_writes",
    "checkpoint_migrations",
}


def include_object(obj, name, type_, reflected, compare_to):
    return not (type_ == "table" and name in CHECKPOINT_TABLES)


def run_migrations_online() -> None:
    with make_engine().connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )
        with context.begin_transaction():
            context.run_migrations()


run_migrations_online()
