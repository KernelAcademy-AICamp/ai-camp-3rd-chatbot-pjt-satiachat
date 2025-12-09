# Medication RAG 시스템 아키텍처 문서

## 개요

이 문서는 DietRx Coach 앱의 **Medications 전용 AI 챗봇** 시스템을 설명합니다.
Dashboard의 식단 코칭 챗봇과 **완전히 분리된** 의약품 전문 상담 시스템입니다.

---

## 1. 시스템 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│                     localhost:8080                              │
├─────────────────────────────────────────────────────────────────┤
│  MedicationChatPanel.tsx                                        │
│         │                                                       │
│         ▼                                                       │
│  useMedicationChat.ts                                           │
│         │                                                       │
│         ├─[1단계]─▶ classifyMedicationIntent() ─▶ OpenAI       │
│         │           (의도 분류: ~50 토큰)         gpt-4o-mini   │
│         │                                                       │
│         ├─[2단계]─▶ getUserHealthContext()                      │
│         │           (Supabase에서 건강 데이터 수집)              │
│         │                                                       │
│         └─[3단계]─▶ fetch('/ask') ────────────────────────────┐ │
│                                                                │ │
└────────────────────────────────────────────────────────────────┼─┘
                                                                 │
┌────────────────────────────────────────────────────────────────▼─┐
│                    Backend (FastAPI + RAG)                       │
│                      localhost:8001                              │
├──────────────────────────────────────────────────────────────────┤
│  api.py                                                          │
│     │                                                            │
│     ▼                                                            │
│  rag_core.py                                                     │
│     │                                                            │
│     ├─▶ 응급 키워드 감지 (가슴통증, 호흡곤란 등)                  │
│     │                                                            │
│     ├─▶ [RAG ON] LlamaIndex Query Engine                         │
│     │      ├─ 질문 → 벡터 변환 (bge-m3)                          │
│     │      ├─ 유사도 검색 (상위 4개 문서)                         │
│     │      └─ GPT-4o-mini로 답변 생성                            │
│     │                                                            │
│     └─▶ [RAG OFF] OpenAI 직접 호출                               │
│            └─ 시스템 프롬프트 + 컨텍스트만 사용                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. 핵심 파일 구조

```
medication-rag/
├── docs/                      # 원본 문서 (식약처 허가정보)
│   ├── wegovy_EE.txt          # 위고비 효능효과
│   ├── wegovy_UD.txt          # 위고비 용법용량
│   ├── wegovy_NB.txt          # 위고비 주의사항
│   ├── mounjaro_EE.txt        # 마운자로 효능효과
│   ├── mounjaro_UD.txt        # 마운자로 용법용량
│   ├── mounjaro_NB.txt        # 마운자로 주의사항
│   └── manifest.json          # 문서 메타데이터
│
├── storage/                   # 벡터 인덱스 (LlamaIndex 자동 생성)
│   ├── default__vector_store.json  # [932KB] 벡터 데이터 (1024차원 * 40개 청크)
│   ├── docstore.json          # [233KB] 원본 텍스트 청크 저장소
│   ├── index_store.json       # [4KB] 인덱스 메타데이터 (노드 ID 매핑)
│   ├── graph_store.json       # [18B] 문서 관계 그래프 (미사용)
│   └── image__vector_store.json  # [72B] 이미지 벡터 (미사용)
│
├── fetch_documents.py         # 식약처에서 문서 수집
├── build_index.py             # 벡터 인덱스 빌드
├── rag_core.py                # RAG 핵심 로직
├── api.py                     # FastAPI 서버
├── requirements.txt           # Python 의존성
└── ARCHITECTURE.md            # 이 문서
```

---

## 3. RAG (Retrieval-Augmented Generation) 작동 원리

### 3.1 RAG란?

RAG는 **검색 증강 생성**의 약자로, LLM이 답변하기 전에 관련 문서를 먼저 검색하는 기술입니다.

```
[기존 LLM]
질문 → GPT → 답변 (GPT의 학습 데이터에만 의존)

[RAG]
질문 → 문서 검색 → 관련 문서 + 질문 → GPT → 답변 (실제 문서 기반)
```

### 3.2 왜 RAG가 필요한가?

| 문제 | RAG 해결책 |
|------|-----------|
| GPT가 최신 정보 모름 | 최신 허가정보 문서 검색 |
| 할루시네이션 (거짓 정보) | 실제 문서 기반 답변 |
| 출처 불명확 | 참고 문서 명시 가능 |

### 3.3 이 시스템의 RAG 흐름

```
사용자: "마운자로 최대 용량이 몇 mg이야?"
                    │
                    ▼
        ┌───────────────────────┐
        │ 1. 질문을 벡터로 변환  │
        │    (bge-m3 임베딩)    │
        └───────────┬───────────┘
                    │ [0.123, -0.456, 0.789, ...]
                    ▼
        ┌───────────────────────┐
        │ 2. 저장된 문서 벡터와  │
        │    유사도 비교         │
        └───────────┬───────────┘
                    │
                    ▼
        ┌───────────────────────────────────────┐
        │ 3. 가장 관련있는 문서 4개 선택         │
        │                                       │
        │ [1] mounjaro_UD.txt (유사도: 0.67)   │
        │     "이 약의 최대 용량은 주 1회 15mg" │
        │ [2] mounjaro_EE.txt (유사도: 0.60)   │
        │ [3] mounjaro_UD.txt (유사도: 0.58)   │
        │ [4] wegovy_UD.txt   (유사도: 0.45)   │
        └───────────┬───────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │ 4. 검색된 문서 +      │
        │    시스템 프롬프트 +   │
        │    사용자 질문        │
        │         ↓             │
        │    GPT-4o-mini        │
        └───────────┬───────────┘
                    │
                    ▼
        "마운자로의 최대 용량은 주 1회 15mg입니다."
```

---

## 4. 임베딩 모델: BAAI/bge-m3

### 4.1 임베딩이란?

텍스트를 **숫자 벡터**로 변환하는 것입니다. 비슷한 의미의 텍스트는 비슷한 벡터를 가집니다.

```python
"마운자로 용량" → [0.12, -0.34, 0.56, ...]  # 1024차원 벡터
"마운자로 복용량" → [0.11, -0.33, 0.57, ...]  # 비슷한 벡터!
"오늘 날씨" → [-0.89, 0.45, -0.12, ...]  # 전혀 다른 벡터
```

### 4.2 왜 bge-m3를 선택했나?

| 모델 | 한국어 지원 | 크기 | 특징 |
|------|------------|------|------|
| text-embedding-ada-002 | 보통 | API | OpenAI API 비용 발생 |
| sentence-transformers | 보통 | 400MB | 영어 최적화 |
| **bge-m3** | **우수** | **500MB** | **다국어, 한국어 성능 좋음** |

### 4.3 bge-m3 특징

- **다국어 지원**: 100개 이상 언어
- **한국어 성능**: 한국어 특화 모델 수준
- **로컬 실행**: API 비용 없음
- **차원**: 1024차원 벡터

---

## 5. 인덱스 빌드 과정

### 5.1 문서 수집 (fetch_documents.py)

```bash
python fetch_documents.py
```

식약처 의약품안전나라(nedrug.mfds.go.kr)에서 위고비/마운자로 허가정보를 다운로드합니다.

| 약물 | 섹션 | 파일명 | 내용 |
|------|------|--------|------|
| 위고비 | EE (효능효과) | wegovy_EE.txt | 적응증, BMI 기준 |
| 위고비 | UD (용법용량) | wegovy_UD.txt | 주사 방법, 용량 |
| 위고비 | NB (주의사항) | wegovy_NB.txt | 부작용, 금기 |
| 마운자로 | EE | mounjaro_EE.txt | 적응증 |
| 마운자로 | UD | mounjaro_UD.txt | 용법용량 |
| 마운자로 | NB | mounjaro_NB.txt | 주의사항 |

### 5.2 벡터 인덱스 빌드 (build_index.py)

```bash
python build_index.py
```

**과정:**
1. 6개 문서 로드
2. 문서를 청크(조각)로 분할 (~40개 청크)
3. 각 청크를 bge-m3로 벡터화
4. storage/ 폴더에 인덱스 저장

**결과:**
```
storage/
├── docstore.json           # 원본 텍스트 저장
├── index_store.json        # 인덱스 메타데이터
├── default__vector_store.json  # 벡터 데이터
└── graph_store.json        # 문서 관계 그래프
```

---

## 6. 2단계 AI 호출 구조

비용 최적화를 위해 **2단계 호출 구조**를 사용합니다.

### 6.1 1단계: 의도 분류 (TypeScript)

```typescript
// src/lib/ai/prompts/medication-classifier.ts
const intent = await classifyMedicationIntent(openai, message);
// 결과: 'medication_info' | 'stats' | 'analysis' | 'chat'
```

**비용**: gpt-4o-mini, ~50 토큰 (매우 저렴)

### 6.2 2단계: RAG API 호출 (Python)

```typescript
// src/hooks/useMedicationChat.ts
const response = await fetch(`${RAG_API_URL}/ask`, {
  body: JSON.stringify({
    query: content,
    user_context: healthContext,
    use_rag: useRag,  // 의도에 따라 결정
    intent: intent,
  }),
});
```

### 6.3 의도별 처리

| 의도 | RAG 사용 | 컨텍스트 | 설명 |
|------|---------|---------|------|
| medication_info | O | O | 약물 정보 질문 → 문서 검색 필요 |
| stats | X | O | 통계 질문 → 건강 데이터만 필요 |
| analysis | O | O | 종합 분석 → 문서 + 데이터 필요 |
| chat | X | X | 인사 → 간단 응답 |

---

## 7. API 명세

### 7.1 POST /ask

**요청:**
```json
{
  "query": "위고비 부작용이 뭐야?",
  "user_context": "체중: 77kg → 65kg (목표)\n7일: -0.8kg",
  "use_rag": true,
  "intent": "medication_info"
}
```

**응답:**
```json
{
  "response": "위고비의 주요 부작용으로는 오심, 설사, 구토...",
  "is_emergency": false,
  "sources": ["위고비 허가사항"]
}
```

### 7.2 GET /health

```json
{
  "status": "healthy",
  "rag_initialized": true
}
```

---

## 8. Dashboard vs Medications 챗봇 비교

| 항목 | Dashboard | Medications |
|------|-----------|-------------|
| **역할** | 식단/체중 코칭 | 의약품 전문 상담 |
| **톤** | 캐릭터 페르소나 (냥이/댕댕이/꿀꿀이) | 전문적 의료 상담 |
| **이모지** | 사용 | 사용 안함 |
| **말투** | 캐릭터별 (~냥, 멍멍!, 꿀꿀!) | 존댓말 (~습니다) |
| **데이터** | Supabase Edge Function | Python RAG API |
| **RAG** | 없음 | 있음 (식약처 문서) |
| **파일** | useChat.ts | useMedicationChat.ts |

---

## 9. 응급 상황 감지

`rag_core.py`에서 응급 키워드를 감지합니다:

```python
EMERGENCY_KEYWORDS = [
    "흉통", "가슴통증", "호흡곤란", "숨을 못",
    "의식저하", "의식불명", "기절", "경련",
    "아나필락시스", "쇼크", "심한 알레르기",
    "갑상선암", "췌장염", "심한 구토", "탈수",
]
```

감지 시 응답:
```
[응급 상황 안내]

말씀하신 증상은 즉각적인 의료 조치가 필요할 수 있습니다.

다음 조치를 권고드립니다:
1. 119에 전화하거나 가까운 응급실을 방문하세요
2. 복용 중인 약물 정보(위고비/마운자로 포함)를 의료진에게 알려주세요
3. 증상이 시작된 시간을 기록해두세요
```

---

## 10. 실행 방법

### 10.1 최초 설정

```bash
# 1. 의존성 설치
cd medication-rag
pip install -r requirements.txt

# 2. 문서 수집 (이미 완료됨)
python fetch_documents.py

# 3. 인덱스 빌드 (이미 완료됨)
python build_index.py
```

### 10.2 서버 실행

```bash
# 터미널 1: RAG API 서버
cd medication-rag
uvicorn api:app --reload --port 8001

# 터미널 2: React 개발 서버
cd ..
npm run dev
```

### 10.3 환경 변수

`.env.local`:
```
VITE_RAG_API_URL=http://localhost:8001
VITE_OPENAI_API_KEY=sk-...
```

---

## 11. 테스트 예시

### 11.1 medication_info (RAG 사용)

```
질문: "마운자로 최대 용량이 몇 mg이야?"
응답: "마운자로의 최대 용량은 주 1회 15 mg 피하주사입니다."
출처: ["마운자로 허가사항"]
```

### 11.2 stats (RAG 미사용)

```
질문: "이번 주 체중 변화는?"
응답: "이번 주 체중 변화는 0.8kg 감소하셨습니다..."
출처: []
```

### 11.3 응급 상황

```
질문: "가슴이 너무 아프고 숨을 못 쉬겠어요"
응답: "[응급 상황 안내] 말씀하신 증상은 즉각적인 의료 조치가..."
is_emergency: true
```

---

## 12. 향후 개선 사항

1. **문서 확장**: 다른 비만 치료제 (삭센다 등) 추가
2. **Hybrid Search**: 키워드 검색 + 벡터 검색 결합
3. **Reranker**: 검색 결과 재순위화로 정확도 향상
4. **캐싱**: 자주 묻는 질문 캐싱으로 응답 속도 개선
5. **다국어**: 영어 질문 지원

---

## 13. 참고 자료

- [LlamaIndex 공식 문서](https://docs.llamaindex.ai/)
- [bge-m3 모델](https://huggingface.co/BAAI/bge-m3)
- [FastAPI 문서](https://fastapi.tiangolo.com/)
- [식약처 의약품안전나라](https://nedrug.mfds.go.kr/)

---

*문서 작성일: 2025-12-08*
*DietRx Coach - Medications RAG AI System*
