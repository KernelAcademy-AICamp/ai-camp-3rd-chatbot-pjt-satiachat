"""
RAG Core Module for Medical Document Q&A
- Loads persisted index from storage/
- Provides ask() function with medical safety rules
- Includes emergency detection and appropriate disclaimers
"""

from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from parent .env.local
BASE_DIR = Path(__file__).parent
PROJECT_ROOT = BASE_DIR.parent
load_dotenv(PROJECT_ROOT / ".env.local")

from llama_index.core import StorageContext, load_index_from_storage, Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.llms.openai import OpenAI

# Paths
STORAGE_DIR = BASE_DIR / "storage"

# Retrieval settings
SIMILARITY_TOP_K = 5

# Emergency keywords (Korean + English)
EMERGENCY_KEYWORDS = [
    # Korean
    "흉통", "가슴통증", "호흡곤란", "숨을 못", "의식저하", "의식불명",
    "기절", "심한 출혈", "대량 출혈", "과다출혈", "자살", "자해",
    "심장마비", "뇌졸중", "경련", "발작", "아나필락시스", "쇼크",
    # English
    "chest pain", "difficulty breathing", "unconscious", "severe bleeding",
    "heart attack", "stroke", "seizure", "anaphylaxis", "suicidal",
]

# Medical safety system prompt
MEDICAL_SYSTEM_PROMPT = """당신은 의학 문서 기반 정보 제공 AI 어시스턴트입니다.

## 핵심 규칙

1. **근거 기반 응답만 제공**
   - 제공된 문서에 근거가 없으면 "해당 정보가 제공된 문서에 없습니다"라고 답변
   - 추측, 외부 지식 기반 답변 절대 금지

2. **출처 명시**
   - 모든 답변에 근거 문서/섹션 요약 포함
   - 가능한 경우 문서명 언급

3. **의료 표현 제한**
   - "~입니다", "~해야 합니다" 같은 확정적 진단/처방 표현 금지
   - "~할 수 있습니다", "~를 고려할 수 있습니다", "문서에 따르면~" 사용

4. **응급 상황 대응**
   - 응급 신호 감지 시 즉시 119/응급실 안내를 최우선으로 제공
   - 응급 신호: 흉통, 호흡곤란, 의식저하, 심한 출혈, 심한 알레르기 반응 등

5. **고지 의무**
   - 모든 답변 끝에 다음 문구 포함:
   "이 정보는 참고용이며, 실제 진단 및 치료는 반드시 의료 전문가와 상담하세요."

## 답변 형식

[답변 내용]

**근거 문서:** [출처 정보]

---
*이 정보는 참고용이며, 실제 진단 및 치료는 반드시 의료 전문가와 상담하세요.*
"""

EMERGENCY_RESPONSE_PREFIX = """
🚨 **응급 상황 안내**

증상이 심각해 보입니다. **즉시 다음 조치를 취하세요:**

1. **119에 전화**하거나 **가까운 응급실**을 방문하세요
2. 주변에 도움을 요청하세요
3. 안전한 자세를 유지하세요

---

"""


class MedicalRAG:
    """Medical RAG system with safety guardrails."""

    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = storage_dir or STORAGE_DIR
        self.index = None
        self.query_engine = None
        self._load_index()

    def _load_index(self):
        """Load persisted index from storage."""
        if not self.storage_dir.exists():
            raise FileNotFoundError(
                f"Storage directory not found: {self.storage_dir}"
            )

        # Configure HuggingFace local embedding
        Settings.embed_model = HuggingFaceEmbedding(
            model_name="BAAI/bge-large-en-v1.5",
        )

        # Configure LLM (gpt-4o-mini for cost-effective responses)
        Settings.llm = OpenAI(model="gpt-4o-mini", temperature=0.1)

        storage_context = StorageContext.from_defaults(
            persist_dir=str(self.storage_dir)
        )
        self.index = load_index_from_storage(storage_context)

        # Create query engine with system prompt
        self.query_engine = self.index.as_query_engine(
            similarity_top_k=SIMILARITY_TOP_K,
            system_prompt=MEDICAL_SYSTEM_PROMPT,
        )

    def _detect_emergency(self, query: str) -> bool:
        """Detect emergency keywords in query."""
        query_lower = query.lower()
        return any(keyword in query_lower for keyword in EMERGENCY_KEYWORDS)

    def _format_sources(self, response) -> str:
        """Format source nodes for citation."""
        if not response.source_nodes:
            return ""

        sources = []
        for i, node in enumerate(response.source_nodes, 1):
            source_name = node.metadata.get('source', 'Unknown')
            score = node.score if hasattr(node, 'score') and node.score else 'N/A'
            sources.append(f"{i}. {source_name} (relevance: {score:.3f})" if isinstance(score, float) else f"{i}. {source_name}")

        return "\n".join(sources)

    def ask(self, query: str, use_rag: bool = True) -> str:
        """
        Process a query and return response with safety guardrails.

        Args:
            query: User's question
            use_rag: Whether to use RAG document retrieval (default True)

        Returns:
            Formatted response with sources and disclaimers
        """
        # Check for emergency
        is_emergency = self._detect_emergency(query)

        # Format response
        result_parts = []

        if is_emergency:
            result_parts.append(EMERGENCY_RESPONSE_PREFIX)

        if use_rag:
            # RAG 사용: 문서 검색 + LLM
            if not self.query_engine:
                return "시스템 오류: 인덱스가 로드되지 않았습니다."

            response = self.query_engine.query(query)
            result_parts.append(str(response))

            # Add sources if available
            sources = self._format_sources(response)
            if sources:
                result_parts.append(f"\n\n**참고 문서:**\n{sources}")
        else:
            # RAG 스킵: LLM만 사용 (토큰 절약)
            from openai import OpenAI
            import os

            client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

            simple_prompt = f"""{MEDICAL_SYSTEM_PROMPT}

사용자 질문:
{query}

위 건강 데이터를 바탕으로 간결하게 분석해주세요."""

            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": simple_prompt}],
                max_tokens=500,
                temperature=0.3,
            )

            result_parts.append(completion.choices[0].message.content)

        return "".join(result_parts)

    def get_retriever(self):
        """Get the underlying retriever for advanced use cases."""
        return self.index.as_retriever(similarity_top_k=SIMILARITY_TOP_K)


# Singleton instance for easy import
_rag_instance: Optional[MedicalRAG] = None


def get_rag() -> MedicalRAG:
    """Get or create RAG instance."""
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = MedicalRAG()
    return _rag_instance


def ask(query: str) -> str:
    """Convenience function to ask a question."""
    return get_rag().ask(query)
