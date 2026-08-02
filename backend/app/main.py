"""
Main application module for Dynamic Dock.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import router

app = FastAPI(
    title="Dynamic Dock API",
    description="A molecular docking platform that enables protein-ligand docking analysis",
    version="0.1.0"
)

# Allowed frontend origins. Works the same on Windows, Linux and macOS since
# it only depends on the port the React dev server / build is served from.
# Override or extend via the DYNAMIC_DOCK_CORS_ORIGINS env var (comma separated).
_default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
_extra_origins = os.environ.get("DYNAMIC_DOCK_CORS_ORIGINS", "")
allow_origins = _default_origins + [o.strip() for o in _extra_origins.split(",") if o.strip()]

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router, prefix="/api")

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Dynamic Dock API",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }
