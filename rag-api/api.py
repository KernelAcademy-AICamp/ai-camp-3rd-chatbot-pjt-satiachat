"""
FastAPI wrapper for MedicalRAG
Run: uvicorn api:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import logging

from rag_core import MedicalRAG

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="Medical RAG API",
    description="RAG-based medical document Q&A",
    version="1.0.0"
)

# CORS for React localhost (any port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG (singleton, loads once at startup)
rag: Optional[MedicalRAG] = None


@app.on_event("startup")
async def startup():
    """Load RAG index on startup."""
    global rag
    try:
        logger.info("Loading MedicalRAG index...")
        rag = MedicalRAG()
        logger.info("MedicalRAG loaded successfully!")
    except FileNotFoundError as e:
        logger.error(f"Failed to load RAG: {e}")
        raise


class QueryRequest(BaseModel):
    """Request body for /ask endpoint."""
    query: str
    user_context: Optional[str] = None  # Health context from React
    use_rag: bool = True  # False면 RAG 스킵 (토큰 절약)


class QueryResponse(BaseModel):
    """Response body for /ask endpoint."""
    response: str
    is_emergency: bool


@app.post("/ask", response_model=QueryResponse)
async def ask(request: QueryRequest):
    """
    Process a medical query with RAG.

    Args:
        query: User's question
        user_context: Optional health context (weight, medications, etc.)
        use_rag: Whether to use RAG document retrieval (default True)

    Returns:
        RAG response with sources and safety disclaimers
    """
    if not rag:
        raise HTTPException(status_code=503, detail="RAG not initialized")

    # Combine user context with query if provided
    full_query = request.query
    if request.user_context:
        full_query = f"""## 사용자 건강 정보
{request.user_context}

## 질문
{request.query}"""

    try:
        # use_rag=False면 RAG 스킵 (토큰 절약)
        response = rag.ask(full_query, use_rag=request.use_rag)
        is_emergency = rag._detect_emergency(request.query)

        return QueryResponse(
            response=response,
            is_emergency=is_emergency
        )
    except Exception as e:
        logger.error(f"RAG query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "rag_loaded": rag is not None
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
