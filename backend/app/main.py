import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.auth.router import router as auth_router
from app.chat.router import router as chat_router
from app.db import engine
from app.documents.router import router as documents_router
from app.errors import install_error_handlers
from app.onboarding.router import router as onboarding_router
from app.spaces.router import router as spaces_router
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
app.include_router(auth_router)
app.include_router(onboarding_router)
app.include_router(spaces_router)
app.include_router(documents_router)
app.include_router(chat_router)


@app.get("/health")
def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except SQLAlchemyError:
        return JSONResponse({"status": "degraded", "database": "down"}, status_code=503)
    return {"status": "ok", "database": "ok"}
