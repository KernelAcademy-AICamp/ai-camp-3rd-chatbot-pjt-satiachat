"""
Medication RAG Core Module
- 위고비/마운자로 전문 의약품 정보 RAG
- 응급 상황 감지 및 의료 안전 가드레일 포함
"""

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# .env.local 로드
BASE_DIR = Path(__file__).parent
PROJECT_ROOT = BASE_DIR.parent
load_dotenv(PROJECT_ROOT / ".env.local")

from llama_index.core import StorageContext, load_index_from_storage, Settings
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.llms.openai import OpenAI

# Paths
STORAGE_DIR = BASE_DIR / "storage"

# Retrieval settings
SIMILARITY_TOP_K = 4

# 응급 상황 키워드 (한국어 + 영어)
EMERGENCY_KEYWORDS = [
    # 심각한 부작용
    "흉통", "가슴통증", "호흡곤란", "숨을 못", "심한 복통",
    "의식저하", "의식불명", "기절", "경련", "발작",
    "아나필락시스", "쇼크", "심한 알레르기",
    "갑상선암", "췌장염", "심한 구토", "탈수",
    # 영어
    "chest pain", "difficulty breathing", "unconscious",
    "severe pain", "anaphylaxis", "pancreatitis",
]

# 시스템 프롬프트
SYSTEM_PROMPT = """당신은 비만 치료제(위고비, 마운자로) 전문 AI 상담사입니다.

## 역할
- 식품의약품안전처 공식 허가 정보를 기반으로 정확한 정보 제공
- 사용자의 건강 데이터(체중, 칼로리, 복용 기록)를 고려한 맞춤 조언
- 친근하고 이해하기 쉬운 설명

## 규칙
1. **문서 기반 답변**: 허가 정보에 없는 내용은 "해당 정보가 없습니다" 답변
2. **출처 명시**: 답변 시 "허가사항에 따르면~" 형식 사용
3. **확정적 표현 금지**: "~할 수 있습니다", "~로 알려져 있습니다" 사용
4. **응급 상황 우선**: 심각한 부작용 증상 시 즉시 병원 방문 안내
5. **의료 면책**: 개인 맞춤 의료 조언이 아님을 명시

## 답변 형식
- 2-3문단으로 간결하게
- 핵심 정보를 먼저, 부가 설명은 나중에
- 이모지 적절히 사용 (💊 📋 ⚠️ ✅)

*이 정보는 참고용이며, 실제 치료는 담당 의사와 상담하세요.*
"""

EMERGENCY_RESPONSE = """
🚨 **응급 상황 안내**

말씀하신 증상이 심각할 수 있습니다. **즉시 다음 조치를 취하세요:**

1. **119에 전화**하거나 **가까운 응급실**을 방문하세요
2. 복용 중인 약물 정보를 의료진에게 알려주세요
3. 증상이 시작된 시간을 기억해두세요

---

"""


class MedicationRAG:
    """위고비/마운자로 전문 RAG 시스템"""

    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = storage_dir or STORAGE_DIR
        self.index = None
        self.query_engine = None
        self._initialized = False

    def initialize(self):
        """인덱스 로드 (lazy initialization)"""
        if self._initialized:
            return

        if not self.storage_dir.exists():
            raise FileNotFoundError(
                f"Storage not found: {self.storage_dir}\n"
                "Run 'python fetch_documents.py' and 'python build_index.py' first."
            )

        print("[RAG] Loading embedding model...")
        Settings.embed_model = HuggingFaceEmbedding(
            model_name="BAAI/bge-m3",
        )

        print("[RAG] Configuring LLM...")
        Settings.llm = OpenAI(model="gpt-4o-mini", temperature=0.2)

        print("[RAG] Loading index...")
        storage_context = StorageContext.from_defaults(
            persist_dir=str(self.storage_dir)
        )
        self.index = load_index_from_storage(storage_context)

        self.query_engine = self.index.as_query_engine(
            similarity_top_k=SIMILARITY_TOP_K,
            system_prompt=SYSTEM_PROMPT,
        )

        self._initialized = True
        print("[RAG] Ready!")

    def _detect_emergency(self, query: str) -> bool:
        """응급 키워드 감지"""
        query_lower = query.lower()
        return any(kw in query_lower for kw in EMERGENCY_KEYWORDS)

    def _format_sources(self, response) -> str:
        """출처 포맷팅"""
        if not response.source_nodes:
            return ""

        sources = []
        seen = set()

        for node in response.source_nodes:
            source = node.metadata.get("file_name", "알 수 없음")
            # 파일명에서 약물명 추출
            if source.startswith("wegovy"):
                source = "위고비 허가사항"
            elif source.startswith("mounjaro"):
                source = "마운자로 허가사항"

            if source not in seen:
                seen.add(source)
                sources.append(source)

        return ", ".join(sources)

    def ask(self, query: str, user_context: str = "", use_rag: bool = True) -> str:
        """
        질문에 답변

        Args:
            query: 사용자 질문
            user_context: 건강 데이터 컨텍스트
            use_rag: RAG 사용 여부 (False면 LLM만 사용)

        Returns:
            포맷된 응답
        """
        self.initialize()

        result_parts = []

        # 응급 상황 체크
        if self._detect_emergency(query):
            result_parts.append(EMERGENCY_RESPONSE)

        # 전체 쿼리 구성
        full_query = query
        if user_context:
            full_query = f"""## 사용자 건강 정보
{user_context}

## 질문
{query}"""

        if use_rag:
            # RAG 사용
            response = self.query_engine.query(full_query)
            result_parts.append(str(response))

            # 출처 추가
            sources = self._format_sources(response)
            if sources:
                result_parts.append(f"\n\n📋 **참고**: {sources}")
        else:
            # LLM만 사용 (토큰 절약)
            from openai import OpenAI as OpenAIClient

            client = OpenAIClient(api_key=os.getenv("OPENAI_API_KEY"))

            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": full_query},
                ],
                max_tokens=500,
                temperature=0.3,
            )

            result_parts.append(completion.choices[0].message.content)

        return "".join(result_parts)

    def is_emergency(self, query: str) -> bool:
        """응급 상황 여부 반환"""
        return self._detect_emergency(query)


# 싱글톤 인스턴스
_rag_instance: Optional[MedicationRAG] = None


def get_rag() -> MedicationRAG:
    """RAG 인스턴스 가져오기"""
    global _rag_instance
    if _rag_instance is None:
        _rag_instance = MedicationRAG()
    return _rag_instance


def ask(query: str, user_context: str = "") -> str:
    """편의 함수"""
    return get_rag().ask(query, user_context)
