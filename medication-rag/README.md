# Medication RAG System

위고비/마운자로 전문 AI 상담 시스템

---

## 🚧 현재 진행 상황 (2025-12-08)

### ✅ 완료
1. **폴더 구조 생성** - `medication-rag/` 디렉토리 및 하위 구조
2. **문서 수집 스크립트** - `fetch_documents.py` 작성 완료
3. **문서 수집 실행** - 식약처에서 6개 문서 다운로드 완료
   - `docs/wegovy_EE.txt`, `wegovy_UD.txt`, `wegovy_NB.txt`
   - `docs/mounjaro_EE.txt`, `mounjaro_UD.txt`, `mounjaro_NB.txt`
4. **인덱스 빌더** - `build_index.py` 작성 완료
5. **RAG 코어** - `rag_core.py` 작성 완료
6. **FastAPI 서버** - `api.py` 작성 완료 (포트 8001)
7. **환경변수** - `.env.local`에 `VITE_RAG_API_URL=http://localhost:8001` 추가

### ⏸️ 중단된 작업
- **인덱스 빌드** (`python build_index.py`)
  - 임베딩 모델(BAAI/bge-m3, ~500MB) 다운로드 중 중단됨
  - 다시 실행하면 이어서 진행됨

### 📋 남은 작업
1. `python build_index.py` 실행하여 벡터 인덱스 생성
2. `uvicorn api:app --reload --port 8001`로 API 서버 실행
3. 프론트엔드에서 테스트
4. (선택) 기존 `rag-api/` 폴더 이름을 `rag-api_unused_backup/`로 변경

### 🔗 관련 파일
- 프론트엔드 훅: `src/hooks/useMedicationChat.ts` (이미 새 API URL 사용하도록 설정됨)
- 챗봇 UI: `src/components/medications/MedicationChatPanel.tsx`

---

## 구조

```
medication-rag/
├── docs/                    # 수집된 문서 (.txt)
├── storage/                 # LlamaIndex 벡터 인덱스
├── fetch_documents.py       # MFDS 문서 수집기
├── build_index.py           # 벡터 인덱스 빌더
├── rag_core.py              # RAG 코어 로직
├── api.py                   # FastAPI 서버
└── requirements.txt         # 의존성
```

## 설치 및 실행

### 1. 의존성 설치

```bash
cd medication-rag
pip install -r requirements.txt
```

### 2. 문서 수집

```bash
python fetch_documents.py
```

식약처(nedrug.mfds.go.kr)에서 위고비/마운자로 허가 정보를 다운로드합니다.

### 3. 인덱스 빌드

```bash
python build_index.py
```

문서를 임베딩하여 벡터 인덱스를 생성합니다.

### 4. API 서버 실행

```bash
uvicorn api:app --reload --port 8001
```

### 5. 프론트엔드 연결

`.env.local`에 API URL 설정:

```
VITE_RAG_API_URL=http://localhost:8001
```

## API 엔드포인트

### POST /ask

```json
{
  "query": "위고비 용법이 어떻게 되나요?",
  "user_context": "체중: 77kg → 목표: 65kg",
  "use_rag": true
}
```

### GET /health

서버 상태 확인

## 수집되는 문서

| 약물 | 섹션 | 파일 |
|------|------|------|
| 위고비 | 효능효과 | wegovy_EE.txt |
| 위고비 | 용법용량 | wegovy_UD.txt |
| 위고비 | 주의사항 | wegovy_NB.txt |
| 마운자로 | 효능효과 | mounjaro_EE.txt |
| 마운자로 | 용법용량 | mounjaro_UD.txt |
| 마운자로 | 주의사항 | mounjaro_NB.txt |
