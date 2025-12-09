"""
DietRx Coach - FastAPI Backend Server

Main entry point for the integrated backend API.
"""
import sys
from pathlib import Path

# Add server directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from core.config import settings
from api.v1.router import router as api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print(f"Starting DietRx Coach API server...")
    print(f"Debug mode: {settings.DEBUG}")
    print(f"CORS origins: {settings.cors_origins_list}")
    yield
    # Shutdown
    print("Shutting down server...")


# Create FastAPI application
app = FastAPI(
    title="DietRx Coach API",
    description="AI-powered diet coaching platform backend",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(api_v1_router)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "DietRx Coach API",
        "version": "1.0.0"
    }


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to DietRx Coach API",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG
    )
