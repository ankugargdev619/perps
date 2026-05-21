from app.lifecycle import lifespan
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os


load_dotenv()

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
            "service": "perps-backend",
            "environment": os.getenv("ENVIRONMENT", "development"),
        }
    )


@app.get("/health", response_class=JSONResponse)
def health() -> JSONResponse:
    """Simple health endpoint."""
    return JSONResponse({"health": "healthy"})
