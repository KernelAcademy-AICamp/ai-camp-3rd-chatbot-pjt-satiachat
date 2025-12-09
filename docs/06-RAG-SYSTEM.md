# RAG 시스템 (약물 정보 검색)

## 개요

LlamaIndex를 사용한 RAG(Retrieval-Augmented Generation) 시스템으로, 식약처 공식 의약품 정보를 기반으로 위고비/마운자로 관련 질문에 답변합니다.

## 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                     오프라인 (사전 준비)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  식약처 API ──→ fetch_documents.py ──→ docs/*.txt               │
│  (nedrug.mfds.go.kr)                                            │
│                     │                                           │
│                     ▼                                           │
│              build_index.py ──→ storage/*.json                  │
│              (BAAI/bge-m3)     (벡터 인덱스)                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     온라인 (런타임)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  사용자 질문 ──→ MedicationRAG.ask()                            │
│  "위고비 부작용?"     │                                          │
│                      ▼                                          │
│            ┌─────────────────────┐                              │
│            │  1. 질문 임베딩     │                              │
│            │  2. 벡터 검색       │                              │
│            │  3. 관련 문서 추출  │                              │
│            │  4. GPT에 컨텍스트  │                              │
│            │  5. 답변 생성       │                              │
│            └─────────────────────┘                              │
│                      │                                          │
│                      ▼                                          │
│  "위고비의 주요 부작용은 오심, 구토, 설사 등이..."              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 문서 수집

### 수집 대상

식약처 의약품안전나라에서 다음 정보를 수집합니다:

| 약물 | 문서 종류 | 파일명 |
|------|----------|--------|
| 위고비 (세마글루타이드) | 효능효과 | `wegovy_효능효과.txt` |
| | 용법용량 | `wegovy_용법용량.txt` |
| | 주의사항 | `wegovy_주의사항.txt` |
| 마운자로 (티르제파타이드) | 효능효과 | `mounjaro_효능효과.txt` |
| | 용법용량 | `mounjaro_용법용량.txt` |
| | 주의사항 | `mounjaro_주의사항.txt` |

### 수집 스크립트

**파일**: `medication-rag/fetch_documents.py`

```python
MEDICATIONS = {
    "wegovy": {
        "name": "위고비",
        "cache_seq": "202301386",  # 식약처 약품 ID
        "sections": ["EE", "UD", "NB"]  # 효능효과, 용법용량, 주의사항
    },
    "mounjaro": {
        "name": "마운자로",
        "cache_seq": "202301983",
        "sections": ["EE", "UD", "NB"]
    }
}

def fetch_document(med_id: str, section: str) -> str:
    """식약처 API에서 문서 가져오기"""
    url = f"https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetail"
    params = {"itemSeq": med_id, "openDataInfoSeq": section}
    response = requests.get(url, params=params)
    # HTML/XML 파싱 후 텍스트 추출
    return parse_content(response.text)
```

**실행**:
```bash
cd medication-rag
python fetch_documents.py
```

## 인덱스 빌드

### 임베딩 모델

**BAAI/bge-m3**: 다국어 지원 임베딩 모델 (한국어 우수)

```python
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

Settings.embed_model = HuggingFaceEmbedding(
    model_name="BAAI/bge-m3",
    trust_remote_code=True
)
```

### 빌드 스크립트

**파일**: `medication-rag/build_index.py`

```python
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings

# 1. 문서 로드
documents = SimpleDirectoryReader(
    input_dir="docs/",
    required_exts=[".txt"]
).load_data()

# 2. 인덱스 생성 (자동 청킹 + 임베딩)
index = VectorStoreIndex.from_documents(documents)

# 3. 저장
index.storage_context.persist(persist_dir="storage/")
```

**실행**:
```bash
python build_index.py
```

### 생성 파일

```
storage/
├── default__vector_store.json  (932KB) - 벡터 데이터
├── docstore.json               (232KB) - 문서 청크
├── index_store.json            - 인덱스 메타데이터
├── image__vector_store.json    - (미사용)
└── graph_store.json            - (미사용)
```

## 런타임 쿼리

### RAG 클래스

**파일**: `server/rag/core.py`

```python
class MedicationRAG:
    def __init__(self):
        self.index = None
        self.query_engine = None

    def initialize(self):
        """저장된 인덱스 로드"""
        storage_context = StorageContext.from_defaults(
            persist_dir="medication-rag/storage"
        )
        self.index = load_index_from_storage(storage_context)
        self.query_engine = self.index.as_query_engine(
            similarity_top_k=3  # 상위 3개 문서 검색
        )

    def ask(self, query: str, user_context: str = "",
            use_rag: bool = True, intent: str = "medication_info") -> dict:
        """질문에 답변"""

        # 응급 상황 체크
        if self._is_emergency(query):
            return {
                "response": "⚠️ 응급 상황입니다. 즉시 119에 연락하세요.",
                "is_emergency": True,
                "sources": []
            }

        # RAG 쿼리
        if use_rag and self.query_engine:
            response = self.query_engine.query(
                f"사용자 상황: {user_context}\n\n질문: {query}"
            )
            return {
                "response": str(response),
                "is_emergency": False,
                "sources": [n.metadata.get("file_name") for n in response.source_nodes]
            }

        # RAG 없이 일반 응답
        return self._general_response(query, user_context)
```

### 쿼리 흐름 상세

```
1. 질문 수신: "위고비 주사 맞는 시간이 중요해?"
        │
        ▼
2. 질문 임베딩: bge-m3 모델로 벡터화
   [0.123, -0.456, 0.789, ...]
        │
        ▼
3. 벡터 검색: 코사인 유사도로 상위 3개 문서 청크 검색
   - wegovy_용법용량.txt (chunk 3): 유사도 0.89
   - wegovy_용법용량.txt (chunk 5): 유사도 0.85
   - mounjaro_용법용량.txt (chunk 2): 유사도 0.72
        │
        ▼
4. 컨텍스트 구성:
   """
   [검색된 문서]
   위고비는 주 1회 피하주사하며, 같은 요일에 투여하는 것이 좋습니다.
   식사와 관계없이 투여할 수 있으며, 투여 시간은 하루 중 아무 때나...

   [사용자 건강 정보]
   현재 체중: 85kg, 목표 체중: 75kg

   [질문]
   위고비 주사 맞는 시간이 중요해?
   """
        │
        ▼
5. GPT-4o-mini 호출: 컨텍스트 + 질문으로 답변 생성
        │
        ▼
6. 응답 반환:
   "위고비는 주 1회 같은 요일에 맞으면 됩니다. 시간은 자유롭게
    선택할 수 있어요. 다만 매주 동일한 시간대에 맞으면 복용을
    잊지 않는 데 도움이 됩니다."
```

## API 엔드포인트

### POST /api/v1/medication/ask

**요청**:
```json
{
  "query": "위고비 부작용 알려줘",
  "include_health_context": true,
  "use_rag": true,
  "intent": "medication_info"
}
```

**응답**:
```json
{
  "response": "위고비(세마글루타이드)의 흔한 부작용은...",
  "is_emergency": false,
  "sources": ["wegovy_주의사항.txt"]
}
```

## 관련 파일

| 위치 | 파일 | 설명 |
|------|------|------|
| `medication-rag/` | `fetch_documents.py` | 문서 수집 스크립트 |
| | `build_index.py` | 인덱스 빌드 스크립트 |
| | `requirements.txt` | Python 의존성 |
| | `docs/` | 원본 텍스트 문서 |
| | `storage/` | 벡터 인덱스 |
| `server/rag/` | `core.py` | RAG 클래스 |
| `server/api/v1/` | `medication.py` | API 엔드포인트 |

## 성능 최적화

### 1. 청킹 전략
- 기본 청크 크기: 1024 토큰
- 오버랩: 20 토큰

### 2. 검색 최적화
```python
query_engine = index.as_query_engine(
    similarity_top_k=3,      # 상위 3개만 검색
    response_mode="compact"  # 응답 압축
)
```

### 3. 캐싱
- 인덱스는 서버 시작 시 1회만 로드
- `@lru_cache`로 반복 쿼리 캐싱 가능

## 확장 방안

### 추가 약물 지원
```python
MEDICATIONS["ozempic"] = {
    "name": "오젬픽",
    "cache_seq": "...",
    "sections": ["EE", "UD", "NB"]
}
```

### 문서 자동 업데이트
```python
# 주기적으로 식약처 API 체크
# 변경 사항 있으면 재빌드
```

### 하이브리드 검색
```python
# 벡터 검색 + 키워드 검색 결합
from llama_index.retrievers import BM25Retriever
```
