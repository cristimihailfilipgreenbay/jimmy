import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db import engine
from app.errors import install_error_handlers
from app.routers import spaces, students
from app.tracing import run_trace_check

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Off the event loop so a slow LangSmith call cannot delay startup.
    asyncio.get_running_loop().run_in_executor(None, run_trace_check)
    yield
    engine.dispose()


app = FastAPI(title="Jimmy", lifespan=lifespan)
install_error_handlers(app)
app.include_router(students.router)
app.include_router(spaces.router)


@app.get("/health")
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except SQLAlchemyError:
        return JSONResponse({"status": "degraded", "database": "down"}, status_code=503)
    return {"status": "ok", "database": "ok"}
