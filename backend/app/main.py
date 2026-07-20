import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import PUBLISHED_DIR, SCREENSHOTS_DIR
from app.db import init_db, reconcile_stale_recordings
from app.logging_config import configure_logging
from app.routers import analytics, export, projects, publish, review, sessions, settings, steps, versions
from app.services.word_automation import word

configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    reconciled = reconcile_stale_recordings()
    if reconciled:
        logger.warning("Reconciled %d project(s) left marked 'active' by a previous process", reconciled)
    word.start()
    try:
        yield
    finally:
        word.stop()


app = FastAPI(title="FlowDocs AI API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # FastAPI's built-in HTTPException handler is more specific and still
    # wins for those -- this only catches genuinely unhandled errors, so a
    # bug never leaks a raw traceback to the frontend.
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error. Check server logs for details."})


app.include_router(projects.router)
app.include_router(sessions.router)
app.include_router(review.router)
app.include_router(steps.router)
app.include_router(versions.router)
app.include_router(export.router)
app.include_router(publish.router)
app.include_router(analytics.router)
app.include_router(settings.router)

# Serve raw/redacted screenshots so the frontend review UI and HTML/Markdown
# export can reference them by URL.
app.mount("/screenshots", StaticFiles(directory=str(SCREENSHOTS_DIR)), name="screenshots")

# Serve published documents (the local "SOP Library" target).
app.mount("/library-files", StaticFiles(directory=str(PUBLISHED_DIR)), name="library-files")


@app.get("/health")
def health():
    return {"status": "ok"}
