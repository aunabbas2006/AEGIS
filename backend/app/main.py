"""FastAPI application entry point.  Run with:  uvicorn app.main:app --reload"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import findings, repositories
from app.config import settings
from app.database import init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="AEGIS API",
    description="Deadline-driven, reachability-aware security monitoring for code repositories.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=settings.cors_origin_regex,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(repositories.router, prefix="/api")
app.include_router(findings.router, prefix="/api")


@app.get("/api/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok"}
