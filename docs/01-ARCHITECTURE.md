# 시스템 아키텍처

## 개요

DietRx Coach는 **하이브리드 BaaS 아키텍처**를 채택하여 개발 속도와 확장성을 모두 확보했습니다.

## 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    React + TypeScript + Vite                     │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │    │
│  │  │Dashboard │  │  Meals   │  │Medications│  │     Reports     │ │    │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────────────────┐
│      Supabase (BaaS)      │   │         FastAPI Server                │
│  ┌─────────────────────┐  │   │  ┌─────────────────────────────────┐  │
│  │   Authentication    │  │   │  │      AI Chat Endpoints          │  │
│  │   (JWT + RLS)       │  │   │  │   /api/v1/chat/message          │  │
│  └─────────────────────┘  │   │  │   /api/v1/medication/ask        │  │
│  ┌─────────────────────┐  │   │  └─────────────────────────────────┘  │
│  │    PostgreSQL       │  │   │  ┌─────────────────────────────────┐  │
│  │  - user_profiles    │  │   │  │     LlamaIndex RAG              │  │
│  │  - meals            │  │   │  │   (Medication Knowledge)        │  │
│  │  - medications      │  │   │  └─────────────────────────────────┘  │
│  │  - progress_logs    │  │   └───────────────────────────────────────┘
│  │  - chat_messages    │  │                   │
│  └─────────────────────┘  │                   ▼
│  ┌─────────────────────┐  │   ┌───────────────────────────────────────┐
│  │   Row Level         │  │   │         OpenAI API                    │
│  │   Security (RLS)    │  │   │      (GPT-4o-mini)                    │
│  └─────────────────────┘  │   └───────────────────────────────────────┘
└───────────────────────────┘
```

## 계층별 설명

### 1. Client Layer (프론트엔드)

| 기술 | 용도 |
|------|------|
| React 18 | UI 라이브러리 |
| TypeScript | 타입 안전성 |
| Vite + SWC | 빌드 도구 (빠른 HMR) |
| TanStack Query | 서버 상태 관리 |
| shadcn/ui | UI 컴포넌트 |
| Tailwind CSS | 스타일링 |

### 2. BaaS Layer (Supabase)

**역할**: CRUD 작업, 인증, 실시간 구독

```typescript
// 프론트엔드에서 직접 Supabase 호출
const { data } = await supabase
  .from('meals')
  .select('*')
  .eq('user_id', userId)
  .eq('date', today);
```

**보안**: Row Level Security (RLS)로 사용자별 데이터 격리
```sql
CREATE POLICY "Users can CRUD own meals" ON public.meals
  FOR ALL USING (auth.uid() = user_id);
```

### 3. API Layer (FastAPI)

**역할**: AI 기능 전용 백엔드

| 엔드포인트 | 기능 |
|-----------|------|
| `POST /api/v1/chat/message` | 식단 코칭 챗봇 |
| `POST /api/v1/medication/ask` | 약물 RAG 챗봇 |
| `GET /api/v1/chat/history` | 채팅 기록 조회 |

**인증**: Supabase JWT 토큰 검증
```python
@router.post("/message")
async def send_message(
    request: ChatRequest,
    user: TokenData = Depends(get_current_user)  # JWT 검증
):
```

### 4. AI Layer

| 구성요소 | 기술 | 용도 |
|---------|------|------|
| LLM | GPT-4o-mini | 대화 생성 |
| Embedding | BAAI/bge-m3 | 문서 임베딩 |
| RAG | LlamaIndex | 약물 정보 검색 |

## 데이터 흐름

### CRUD 작업 (식단, 약물, 체중)
```
User → React → Supabase Client → PostgreSQL
                    ↓
              RLS 정책 적용
                    ↓
              데이터 반환
```

### AI 챗봇 요청
```
User → React → FastAPI → JWT 검증
                  ↓
           의도 분류 (Intent Classification)
                  ↓
        ┌─────────┴─────────┐
        ↓                   ↓
   일반 대화            RAG 질의
        ↓                   ↓
   GPT-4o-mini      LlamaIndex 검색
        ↓                   ↓
        └─────────┬─────────┘
                  ↓
           응답 생성 & 반환
```

## 주요 설계 결정

### 1. 왜 하이브리드 아키텍처인가?

| 접근법 | 장점 | 단점 |
|--------|------|------|
| Supabase Only | 빠른 개발, 간단한 구조 | AI 기능 제한 |
| FastAPI Only | 완전한 제어 | 개발 시간 증가 |
| **하이브리드** | 두 장점 결합 | 복잡성 증가 |

**결론**: MVP 단계에서 속도와 기능을 모두 확보하기 위해 하이브리드 선택

### 2. RLS vs 백엔드 인증

- **RLS 사용**: 프론트엔드 직접 접근 시 데이터 보안
- **JWT 검증**: FastAPI 엔드포인트 보호

### 3. 상태 관리

```
┌─────────────────────────────────────────┐
│           TanStack Query                │
│  ┌─────────────┐  ┌─────────────────┐   │
│  │ Server State│  │ Optimistic      │   │
│  │ (캐싱)      │  │ Updates         │   │
│  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────┘
```

## 확장 고려사항

### 단기 (현재)
- 로컬 개발 환경
- Supabase 무료 티어

### 중기 (배포 시)
- Vercel (프론트엔드)
- Railway/Render (FastAPI)
- Supabase Pro (필요시)

### 장기 (스케일업 시)
- 컨테이너화 (Docker)
- 로드 밸런서
- CDN (정적 자산)
- Redis (캐싱)
