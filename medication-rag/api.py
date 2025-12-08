"""
Medication RAG FastAPI Server
Run: uvicorn api:app --reload --port 8001
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import logging

from rag_core import MedicationRAG

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI 앱
app = FastAPI(
    title="Medication RAG API",
    description="위고비/마운자로 전문 AI 상담 API",
    version="2.0.0",
)

# CORS (React dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# RAG 인스턴스
rag: Optional[MedicationRAG] = None


@app.on_event("startup")
async def startup():
    """서버 시작 시 RAG 초기화"""
    global rag
    try:
        logger.info("Initializing MedicationRAG...")
        rag = MedicationRAG()
        rag.initialize()
        logger.info("MedicationRAG ready!")
    except FileNotFoundError as e:
        logger.warning(f"RAG not ready: {e}")
        logger.warning("Run fetch_documents.py and build_index.py first.")


class QueryRequest(BaseModel):
    """요청 모델"""
    query: str
    user_context: Optional[str] = None
    use_rag: bool = True


class QueryResponse(BaseModel):
    """응답 모델"""
    response: str
    is_emergency: bool


@app.post("/ask", response_model=QueryResponse)
async def ask_endpoint(request: QueryRequest):
    """
    약물 관련 질문 처리

    Args:
        query: 사용자 질문
        user_context: 건강 데이터 (체중, 칼로리, 복용 기록 등)
        use_rag: RAG 문서 검색 사용 여부

    Returns:
        AI 응답 및 응급 상황 여부
    """
    if not rag or not rag._initialized:
        raise HTTPException(
            status_code=503,
            detail="RAG not initialized. Run setup scripts first."
        )

    try:
        response = rag.ask(
            query=request.query,
            user_context=request.user_context or "",
            use_rag=request.use_rag,
        )

        return QueryResponse(
            response=response,
            is_emergency=rag.is_emergency(request.query),
        )

    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    """헬스 체크"""
    return {
        "status": "healthy",
        "rag_initialized": rag._initialized if rag else False,
    }


@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "name": "Medication RAG API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
