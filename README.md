# **GLP-1 사용자 대상 LLM API를 활용한 다이어트 보조 챗봇 DietRx Coach 개발**
본 프로젝트는 OpenAI GPT-4o-mini와 LlamaIndex RAG 시스템을 활용하여 GLP-1 계열 비만치료제(위고비, 마운자로) 사용자를 위한 **AI 기반 다이어트 코칭 플랫폼**을 개발합니다. 사용자의 식단 기록, 체중 변화, 약물 복용 데이터를 기반으로 **개인화된 식단 코칭, 약물 정보 Q&A, 복용 일정 관리** 등 핵심적인 건강 관리 기능을 제공하는 것을 목표로 합니다.

- **프로젝트 기간:** 2025.12.04 ~ 2025.12.10 (총 1주일)
- **배포 링크:** [서비스 바로가기](링크 입력) *(완료 후 추가)*

---

## **1. 서비스 구성 요소**
### **1.1 주요 기능**
- **AI 식단 코칭 챗봇 (1순위):** 3가지 페르소나(차가운/밝은/엄격한 코치) 중 선택하여 개인화된 식단 피드백을 받습니다. 자연어로 "점심에 비빔밥 먹었어"라고 말하면 자동으로 식단이 기록됩니다.
- **RAG 기반 약물 Q&A (2순위):** 식약처 공식 의약품 정보를 기반으로 위고비/마운자로 관련 질문(부작용, 용법용량, 주의사항 등)에 정확하게 답변합니다.
- **약물 복용 스케줄 관리 (3순위):** 주 1회 GLP-1 약물 복용 일정을 달력으로 관리하고, 복용 기록을 추적합니다.
- **식단 기록 및 분석:** 11,086개의 한국 음식 DB를 기반으로 칼로리와 영양소(단백질, 탄수화물, 지방)를 자동 추적합니다.

### **1.2 사용자 흐름**
- **사용자 시나리오 예시:**
  1. 사용자가 회원가입 후 온보딩에서 현재 체중, 목표 체중, 활동량, AI 코치 페르소나를 설정합니다.
  2. 대시보드에서 오늘의 칼로리 섭취량, 최근 체중 변화, 약물 복용 현황을 한눈에 확인합니다.
  3. AI 챗봇에 "오늘 점심에 비빔밥이랑 된장찌개 먹었어"라고 입력하면 자동으로 식단이 기록됩니다.
  4. 약물 탭에서 복용 요일을 설정하고, 달력에서 복용 완료/미완료를 체크합니다.
  5. "위고비 부작용이 뭐야?" 같은 질문을 RAG 챗봇에 하면 식약처 문서 기반으로 답변을 받습니다.

---

## **2. 활용 장비 및 협업 툴**

### **2.1 활용 장비**
- **개발 환경:** Windows 11 / macOS 기반 개인 PC
- **서버 환경:** Local 환경 구동 (Supabase Cloud 활용)

### **2.2 협업 툴**
- **소스 관리:** GitHub
- **프로젝트 관리:** Notion
- **커뮤니케이션:** Slack, Discord
- **버전 관리:** Git

---

## **3. 최종 선정 AI 모델 구조**
- **모델 이름:** **OpenAI GPT-4o-mini** (식단 챗봇), **LlamaIndex + BAAI/bge-m3** (약물 RAG)
- **구조 및 설명:** 본 프로젝트는 두 가지 AI 시스템을 활용합니다:
  1. **식단 코칭 챗봇:** GPT-4o-mini를 Function Calling과 함께 사용하여 사용자 메시지에서 식단 정보를 추출하고 자동으로 DB에 기록합니다. Intent 분류를 통해 기록/조회/분석/대화 등 적절한 처리 방식을 결정합니다.
  2. **약물 RAG 시스템:** 식약처 공식 문서를 BAAI/bge-m3 모델로 임베딩하여 벡터 인덱스를 생성하고, 사용자 질문과 유사한 문서를 검색하여 GPT-4o-mini가 답변을 생성합니다.
- **학습 데이터:** 식약처 의약품안전나라에서 수집한 위고비/마운자로 공식 문서(효능효과, 용법용량, 주의사항)
- **평가 지표:** 식단 기록 정확도, RAG 답변의 정확성 및 출처 명시, 사용자 경험 만족도를 정성적으로 평가합니다.

---

## **4. 서비스 아키텍처**
### **4.1 시스템 구조도**
사용자 인터페이스(React)에서 입력을 받아 Supabase(인증/DB)와 FastAPI(AI 처리)로 전달하고, 결과를 다시 사용자에게 보여주는 하이브리드 아키텍처를 따릅니다.
```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   User (Client)  │────▶│     Supabase     │────▶│    PostgreSQL    │
│  (React/Vite)    │     │   (Auth / DB)    │     │  (meals, meds)   │
└──────────────────┘     └──────────────────┘     └──────────────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│   FastAPI Server │────▶│   OpenAI API     │
│  (AI Chat, RAG)  │     │   LlamaIndex     │
└──────────────────┘     └──────────────────┘
```

### **4.2 데이터 흐름도**
1.  **사용자 입력:** 사용자가 React UI를 통해 채팅 메시지를 입력합니다.
2.  **인증 확인:** Supabase Auth로 JWT 토큰을 검증합니다.
3.  **Intent 분류:** FastAPI 서버가 메시지의 의도(기록/조회/분석/대화)를 분류합니다.
4.  **Function Calling:** 식단 기록 Intent면 GPT가 음식명/칼로리를 추출하여 DB에 저장합니다.
5.  **RAG 검색:** 약물 질문이면 벡터 검색으로 관련 문서를 찾아 컨텍스트에 포함합니다.
6.  **응답 생성:** 페르소나가 적용된 응답을 생성하여 사용자에게 반환합니다.

---

## **5. 사용 기술 스택**
### **5.1 백엔드**
- **Framework:** FastAPI (Python 3.11)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (JWT)
- **LLM API:** OpenAI GPT-4o-mini

### **5.2 프론트엔드**
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite + SWC
- **UI Library:** shadcn/ui (Radix Primitives)
- **Styling:** Tailwind CSS
- **State Management:** TanStack Query (React Query)
- **Routing:** React Router v6

### **5.3 머신러닝 및 데이터 분석**
- **RAG Framework:** LlamaIndex
- **Embedding Model:** BAAI/bge-m3 (다국어 지원)
- **LLM Libraries:** `openai`, `llama-index`
- **Data Source:** 식약처 의약품안전나라 API

### **5.4 배포 및 운영**
- **Frontend:** Vercel / Netlify
- **Backend:** Railway / Render
- **Database:** Supabase Cloud
- **Runtime Environment:** Node.js 18+, Python 3.11+

---

## **6. 팀원 소개**


| ![어현우](https://avatars.githubusercontent.com/u/156163982?v=4) | ![김혜민](https://avatars.githubusercontent.com/u/156163982?v=4) |
| :--------------------------------------------------------------: | :--------------------------------------------------------------: |
|            [어현우](https://github.com/EHW99)             |            [김혜민](https://github.com/)             |

---

## **7. Appendix**
### **7.1 참고 자료**
- **API 문서:** [OpenAI API Reference](https://platform.openai.com/docs/api-reference), [Supabase Documentation](https://supabase.com/docs)
- **프레임워크:** [FastAPI 공식 문서](https://fastapi.tiangolo.com/), [React 공식 문서](https://react.dev/)
- **RAG 시스템:** [LlamaIndex Documentation](https://docs.llamaindex.ai/)
- **UI 컴포넌트:** [shadcn/ui](https://ui.shadcn.com/)
- [위고비프리필드펜1.0 (세마글루타이드) — 의약품정보](https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetailCache?cacheSeq=202301386aupdateTs2024-07-09+09%3A45%3A43.250267b)
- [마운자로프리필드펜주 2.5 mg (티르제파타이드) — 의약품정보](https://nedrug.mfds.go.kr/pbp/CCBBB01/getItemDetailCache?cacheSeq=202301983aupdateTs2025-07-22+09%3A05%3A22.239066b)


### **7.2 설치 및 실행 방법**
1.  **Repository 클론:**
    ```bash
    git clone https://github.com/KernelAcademy-AICamp/ai-camp-3rd-chatbot-pjt-satiachat?tab=readme-ov-file
    cd mini_project
    ```

2.  **Frontend 설정:**
    ```bash
    npm install
    npm run dev
    ```

3.  **Backend 설정:**
    ```bash
    cd server
    pip install -r requirements.txt
    python -m uvicorn main:app --reload --port 8000
    ```

4.  **.env 파일 생성 및 API 키 설정:**
    - Frontend (`.env.local`):
    ```
    VITE_SUPABASE_URL="YOUR_SUPABASE_URL"
    VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
    VITE_API_URL="http://localhost:8000/api/v1"
    ```
    - Backend (`server/.env`):
    ```
    OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
    SUPABASE_URL="YOUR_SUPABASE_URL"
    SUPABASE_SERVICE_KEY="YOUR_SUPABASE_SERVICE_KEY"
    ```

5.  **애플리케이션 실행:**
    ```bash
    # Frontend (터미널 1)
    npm run dev

    # Backend (터미널 2)
    cd server && python -m uvicorn main:app --reload --port 8000
    ```

### **7.3 주요 커밋 기록 및 업데이트 내역**

| 날짜 | 업데이트 내용 | 담당자 |
| :--- | :--- | :--- |
| 2025.12.04 | 프로젝트 초기 설정 및 Supabase 연동 | 어현우 |
| 2025.12.05 | 온보딩 플로우 및 사용자 프로필 구현 | 김혜민 |
| 2025.12.06 | AI 챗봇 페르소나 시스템 구현 | 어현우 |
| 2025.12.07 | 약물 관리 기능 및 달력 UI 개발 | 김혜민 |
| 2025.12.08 | FastAPI 백엔드 및 RAG 시스템 구축 | 어현우 |
| 2025.12.09 | UI 개선 및 로고 디자인 적용 | 김혜민 |
| 2025.12.10 | 전체 기능 통합 및 최종 테스트 | 전원 |
