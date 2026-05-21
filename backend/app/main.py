from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.config.database import check_database_connection
from app.config.settings import settings
from app.lifecycle import lifespan

app = FastAPI(
    title="Perps Backend",
    description="FastAPI backend for the Perps project",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/", response_class=JSONResponse)
def root() -> JSONResponse:
    """Health check and backend metadata."""
    return JSONResponse(
        {
            "status": "ok",
            "service": settings.service_name,
            "environment": settings.environment,
        }
    )


@app.get("/health", response_class=JSONResponse)
def health() -> JSONResponse:
    """Simple health endpoint."""
    return JSONResponse({"health": "healthy"})


@app.get("/health/db", response_class=JSONResponse)
def database_health() -> JSONResponse:
    """Database connectivity health endpoint."""
    check_database_connection()
    return JSONResponse({"database": "connected"})
