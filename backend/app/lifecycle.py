from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.config.redis import get_redis


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application startup and shutdown hook."""
    # Hard-fail app startup if Redis is unreachable or Streams commands fail.
    redis = get_redis()
    await redis.ping()
    await redis.xadd("__perps_startup_healthcheck_stream", {"ok": "1"}, maxlen=1)

    app.state.redis = redis
    try:
        yield
    finally:
        await redis.aclose()
