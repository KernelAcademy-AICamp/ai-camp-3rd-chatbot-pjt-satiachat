"""
DietRx Coach 프로젝트 발표 PPT - 새로 제작
세련된 디자인 + 챗봇 상세 설명
"""
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import nsmap
from pptx.oxml import parse_xml

# 컬러 팔레트 (Teal & Coral - 프로젝트 테마)
PRIMARY = RGBColor(0x5E, 0xA8, 0xA7)      # Teal
PRIMARY_DARK = RGBColor(0x27, 0x78, 0x84)  # Dark Teal
ACCENT = RGBColor(0xFE, 0x44, 0x47)        # Coral
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
BLACK = RGBColor(0x1C, 0x28, 0x33)
GRAY = RGBColor(0x6B, 0x7B, 0x8C)
LIGHT_GRAY = RGBColor(0xF4, 0xF6, 0xF6)

# 프레젠테이션 생성 (16:9)
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

def add_title_box(slide, text, left, top, width, height, font_size=44, bold=True, color=BLACK, align=PP_ALIGN.LEFT):
    """타이틀 텍스트 박스 추가"""
    box = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(height))
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.font.name = "맑은 고딕"
    p.alignment = align
    return box

def add_text_box(slide, text, left, top, width, height, font_size=18, color=BLACK, bold=False, align=PP_ALIGN.LEFT):
    """일반 텍스트 박스 추가"""
    box = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(height))
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.font.name = "맑은 고딕"
    p.alignment = align
    return box

def add_bullet_text(slide, items, left, top, width, height, font_size=16, color=BLACK):
    """불릿 리스트 추가"""
    box = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(height))
    tf = box.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = f"• {item}"
        p.font.size = Pt(font_size)
        p.font.color.rgb = color
        p.font.name = "맑은 고딕"
        p.space_after = Pt(8)
    return box

def add_rectangle(slide, left, top, width, height, fill_color, border=False):
    """사각형 도형 추가"""
    shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        Inches(left), Inches(top), Inches(width), Inches(height)
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if not border:
        shape.line.fill.background()
    return shape

def add_rounded_rect(slide, left, top, width, height, fill_color):
    """둥근 사각형 추가"""
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        Inches(left), Inches(top), Inches(width), Inches(height)
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    shape.line.fill.background()
    return shape

# ========== 슬라이드 1: 타이틀 ==========
slide1 = prs.slides.add_slide(prs.slide_layouts[6])
add_rectangle(slide1, 0, 0, 13.333, 7.5, PRIMARY_DARK)
add_rectangle(slide1, 0, 5.5, 13.333, 2, PRIMARY)

add_title_box(slide1, "DietRx Coach", 0.8, 2.0, 12, 1.2, font_size=60, color=WHITE, align=PP_ALIGN.CENTER)
add_text_box(slide1, "GLP-1 사용자를 위한 AI 기반 다이어트 코칭 플랫폼", 0.8, 3.3, 12, 0.8, font_size=28, color=LIGHT_GRAY, align=PP_ALIGN.CENTER)

add_text_box(slide1, "Chat Bot Project  |  2025. 12. 10", 0.8, 6.0, 6, 0.5, font_size=16, color=WHITE)
add_text_box(slide1, "커널아카데미 AI 심화캠프", 6.5, 6.0, 6, 0.5, font_size=16, color=WHITE, align=PP_ALIGN.RIGHT)

# ========== 슬라이드 2: 팀원 소개 ==========
slide2 = prs.slides.add_slide(prs.slide_layouts[6])
add_rectangle(slide2, 0, 0, 13.333, 1.2, PRIMARY_DARK)
add_title_box(slide2, "팀원 소개", 0.5, 0.3, 12, 0.8, font_size=36, color=WHITE)

# 팀원 카드
for i, (name, role, tasks) in enumerate([
    ("어현우", "Backend / AI", ["FastAPI 서버 구축", "AI 챗봇 시스템", "RAG 파이프라인", "Supabase 연동"]),
    ("김혜민", "Frontend / Design", ["React UI 개발", "약물 관리 UI", "로고 디자인", "UX 개선"])
]):
    x = 1.5 + i * 5.5
    add_rounded_rect(slide2, x, 1.8, 4.5, 4.8, LIGHT_GRAY)
    add_rectangle(slide2, x, 1.8, 4.5, 0.8, PRIMARY)
    add_text_box(slide2, name, x, 1.9, 4.5, 0.6, font_size=24, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    add_text_box(slide2, role, x, 2.7, 4.5, 0.5, font_size=14, color=GRAY, align=PP_ALIGN.CENTER)
    add_bullet_text(slide2, tasks, x + 0.3, 3.3, 4, 3, font_size=14, color=BLACK)

# ========== 슬라이드 3: 프로젝트 개요 ==========
slide3 = prs.slides.add_slide(prs.slide_layouts[6])
add_rectangle(slide3, 0, 0, 13.333, 1.2, PRIMARY_DARK)
add_title_box(slide3, "프로젝트 개요", 0.5, 0.3, 12, 0.8, font_size=36, color=WHITE)

add_text_box(slide3, "프로젝트 목표", 0.8, 1.5, 6, 0.5, font_size=20, color=PRIMARY_DARK, bold=True)
add_text_box(slide3, "GLP-1 계열 비만치료제(위고비, 마운자로) 사용자를 위한\nAI 기반 통합 건강 관리 플랫폼 개발", 0.8, 2.0, 6, 1, font_size=16, color=BLACK)

add_text_box(slide3, "핵심 기능", 0.8, 3.2, 6, 0.5, font_size=20, color=PRIMARY_DARK, bold=True)
add_bullet_text(slide3, [
    "AI 식단 코칭 (3가지 페르소나)",
    "RAG 기반 약물 Q&A",
    "약물 복용 스케줄 관리",
    "칼로리/영양소 자동 추적"
], 0.8, 3.7, 5.5, 2.5, font_size=15, color=BLACK)

# 오른쪽 - 기술 스택
add_rounded_rect(slide3, 7, 1.5, 5.5, 5.3, LIGHT_GRAY)
add_text_box(slide3, "기술 스택", 7.3, 1.7, 5, 0.5, font_size=18, color=PRIMARY_DARK, bold=True)

techs = [
    ("Frontend", "React 18, TypeScript, Tailwind CSS"),
    ("Backend", "FastAPI, Supabase"),
    ("AI/ML", "GPT-4o-mini, LlamaIndex RAG"),
    ("Database", "PostgreSQL (Supabase)"),
    ("인증", "Supabase Auth (JWT)")
]
for i, (label, value) in enumerate(techs):
    y = 2.3 + i * 0.85
    add_text_box(slide3, label, 7.3, y, 2, 0.4, font_size=13, color=PRIMARY_DARK, bold=True)
    add_text_box(slide3, value, 9.2, y, 3, 0.4, font_size=13, color=BLACK)

# ========== 슬라이드 4: 서비스 아키텍처 ==========
slide4 = prs.slides.add_slide(prs.slide_layouts[6])
add_rectangle(slide4, 0, 0, 13.333, 1.2, PRIMARY_DARK)
add_title_box(slide4, "서비스 아키텍처", 0.5, 0.3, 12, 0.8, font_size=36, color=WHITE)

add_text_box(slide4, "하이브리드 BaaS 아키텍처: Supabase(CRUD) + FastAPI(AI)", 0.8, 1.4, 12, 0.5, font_size=16, color=GRAY)

# 아키텍처 박스들
boxes = [
    (1, 2.2, "React\n+ Vite", PRIMARY, "Frontend"),
    (4, 2.2, "Supabase\nAuth/DB", RGBColor(0x3E, 0xCF, 0x8E), "BaaS"),
    (7, 2.2, "PostgreSQL", RGBColor(0x33, 0x6D, 0x91), "Database"),
    (4, 4.5, "FastAPI\nAI Server", ACCENT, "Backend"),
    (7, 4.5, "OpenAI\nLlamaIndex", RGBColor(0x74, 0xAA, 0x9C), "AI/ML"),
]

for x, y, text, color, label in boxes:
    add_rounded_rect(slide4, x, y, 2.2, 1.3, color)
    add_text_box(slide4, text, x, y + 0.2, 2.2, 1, font_size=14, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    add_text_box(slide4, label, x, y + 1.35, 2.2, 0.4, font_size=11, color=GRAY, align=PP_ALIGN.CENTER)

# 화살표 설명
add_text_box(slide4, "→", 3.3, 2.5, 0.5, 0.5, font_size=24, color=GRAY)
add_text_box(slide4, "→", 6.3, 2.5, 0.5, 0.5, font_size=24, color=GRAY)
add_text_box(slide4, "↓", 2, 3.6, 0.5, 0.5, font_size=24, color=GRAY)
add_text_box(slide4, "→", 6.3, 4.8, 0.5, 0.5, font_size=24, color=GRAY)

# 설명
add_rounded_rect(slide4, 10, 2, 2.8, 4.2, LIGHT_GRAY)
add_text_box(slide4, "역할 분리", 10.2, 2.2, 2.5, 0.4, font_size=14, color=PRIMARY_DARK, bold=True)
add_bullet_text(slide4, [
    "Supabase: CRUD,\n  인증, RLS 보안",
    "FastAPI: AI 처리,\n  RAG 검색",
    "OpenAI: LLM 추론,\n  Function Calling"
], 10.2, 2.7, 2.5, 3.2, font_size=12, color=BLACK)

# ========== 슬라이드 5: AI 챗봇 시스템 (상세) ==========
slide5 = prs.slides.add_slide(prs.slide_layouts[6])
add_rectangle(slide5, 0, 0, 13.333, 1.2, PRIMARY_DARK)
add_title_box(slide5, "AI 챗봇 시스템 - 식단 코칭", 0.5, 0.3, 12, 0.8, font_size=36, color=WHITE)

# 왼쪽 - 페르소나 시스템
add_text_box(slide5, "3가지 AI 코치 페르소나", 0.8, 1.5, 6, 0.5, font_size=20, color=PRIMARY_DARK, bold=True)

personas = [
    ("❄️ 차가운 코치", "팩트 중심, 감정 배제", "숫자와 데이터만 전달", RGBColor(0x5D, 0xAD, 0xE2)),
    ("☀️ 밝은 코치", "따뜻하고 격려하는", "칭찬과 동기부여 제공", RGBColor(0xF3, 0x9C, 0x12)),
    ("🔥 엄격한 코치", "직설적, 목표 집중", "변명 없이 결과 중심", RGBColor(0xE7, 0x4C, 0x3C))
]

for i, (name, style, desc, color) in enumerate(personas):
    y = 2.1 + i * 1.1
    add_rounded_rect(slide5, 0.8, y, 5.5, 0.95, color)
    add_text_box(slide5, name, 1, y + 0.1, 2.5, 0.4, font_size=15, color=WHITE, bold=True)
    add_text_box(slide5, f"{style}\n{desc}", 3.3, y + 0.1, 2.8, 0.8, font_size=12, color=WHITE)

# 오른쪽 - Intent 분류
add_text_box(slide5, "Intent 분류 시스템", 7, 1.5, 5.5, 0.5, font_size=20, color=PRIMARY_DARK, bold=True)

intents = [
    ("log", "\"점심에 비빔밥 먹었어\"", "→ 식사 자동 기록"),
    ("query", "\"오늘 뭐 먹었지?\"", "→ 기록 조회"),
    ("stats", "\"이번 주 칼로리\"", "→ 통계 계산"),
    ("analyze", "\"오늘 식단 평가해줘\"", "→ AI 분석"),
    ("chat", "\"다이어트 팁 알려줘\"", "→ 일반 대화")
]

for i, (intent, example, result) in enumerate(intents):
    y = 2.1 + i * 0.85
    add_rounded_rect(slide5, 7, y, 1.2, 0.7, PRIMARY)
    add_text_box(slide5, intent, 7.1, y + 0.15, 1, 0.4, font_size=12, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    add_text_box(slide5, example, 8.4, y + 0.05, 2.3, 0.35, font_size=11, color=BLACK)
    add_text_box(slide5, result, 8.4, y + 0.4, 2.3, 0.35, font_size=11, color=GRAY)

# 하단 - Function Calling
add_rectangle(slide5, 0.5, 5.5, 12.3, 1.5, LIGHT_GRAY)
add_text_box(slide5, "Function Calling으로 자동 식단 기록", 0.8, 5.6, 6, 0.4, font_size=16, color=PRIMARY_DARK, bold=True)
add_text_box(slide5, "사용자: \"점심에 비빔밥이랑 된장찌개 먹었어\"  →  GPT가 log_meal 함수 호출  →  {meal_type: \"lunch\", foods: [{name: \"비빔밥\", calories: 550}, {name: \"된장찌개\", calories: 120}]}  →  DB 자동 저장",
             0.8, 6.1, 11.8, 0.8, font_size=13, color=BLACK)

# ========== 슬라이드 6: RAG 시스템 (상세) ==========
slide6 = prs.slides.add_slide(prs.slide_layouts[6])
add_rectangle(slide6, 0, 0, 13.333, 1.2, PRIMARY_DARK)
add_title_box(slide6, "RAG 시스템 - 약물 정보 Q&A", 0.5, 0.3, 12, 0.8, font_size=36, color=WHITE)

add_text_box(slide6, "식약처 공식 문서 기반 정확한 약물 정보 제공", 0.8, 1.4, 12, 0.5, font_size=16, color=GRAY)

# 왼쪽 - RAG 파이프라인
add_text_box(slide6, "RAG 파이프라인", 0.8, 1.9, 6, 0.5, font_size=18, color=PRIMARY_DARK, bold=True)

steps = [
    ("1. 문서 수집", "식약처 의약품안전나라 API"),
    ("2. 임베딩", "BAAI/bge-m3 (다국어 지원)"),
    ("3. 벡터 저장", "LlamaIndex VectorStoreIndex"),
    ("4. 유사도 검색", "코사인 유사도 Top-3"),
    ("5. 응답 생성", "GPT-4o-mini + 컨텍스트")
]

for i, (step, desc) in enumerate(steps):
    y = 2.4 + i * 0.75
    add_rounded_rect(slide6, 0.8, y, 1.8, 0.6, PRIMARY)
    add_text_box(slide6, step, 0.9, y + 0.1, 1.6, 0.4, font_size=12, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    add_text_box(slide6, desc, 2.8, y + 0.15, 3.5, 0.4, font_size=13, color=BLACK)

# 오른쪽 - 수집 문서
add_rounded_rect(slide6, 7, 1.9, 5.5, 2.5, LIGHT_GRAY)
add_text_box(slide6, "수집 문서 (식약처 공식)", 7.2, 2.0, 5, 0.4, font_size=14, color=PRIMARY_DARK, bold=True)

docs = [
    "위고비 (세마글루타이드)",
    "  - 효능효과, 용법용량, 주의사항",
    "마운자로 (티르제파타이드)",
    "  - 효능효과, 용법용량, 주의사항"
]
for i, doc in enumerate(docs):
    add_text_box(slide6, doc, 7.3, 2.5 + i * 0.45, 5, 0.4, font_size=12, color=BLACK)

# Q&A 예시
add_rounded_rect(slide6, 7, 4.6, 5.5, 2.4, RGBColor(0xE8, 0xF6, 0xF3))
add_text_box(slide6, "Q&A 예시", 7.2, 4.7, 5, 0.4, font_size=14, color=PRIMARY_DARK, bold=True)
add_text_box(slide6, "Q: 위고비 부작용이 뭐야?", 7.3, 5.2, 5, 0.4, font_size=13, color=BLACK, bold=True)
add_text_box(slide6, "A: 위고비(세마글루타이드)의 주요 부작용은\n오심(구역질), 구토, 설사, 변비, 복통 등\n위장관계 이상반응입니다.\n\n(출처: wegovy_주의사항.txt)",
             7.3, 5.6, 5, 1.3, font_size=12, color=GRAY)

# ========== 슬라이드 7: 약물 관리 기능 ==========
slide7 = prs.slides.add_slide(prs.slide_layouts[6])
add_rectangle(slide7, 0, 0, 13.333, 1.2, PRIMARY_DARK)
add_title_box(slide7, "약물 복용 관리", 0.5, 0.3, 12, 0.8, font_size=36, color=WHITE)

add_text_box(slide7, "주 1회 GLP-1 약물 복용 스케줄 관리", 0.8, 1.4, 12, 0.5, font_size=16, color=GRAY)

# 왼쪽 - 기능 설명
add_text_box(slide7, "주요 기능", 0.8, 1.9, 6, 0.5, font_size=18, color=PRIMARY_DARK, bold=True)

features = [
    "주간 복용 요일 설정 (매주 같은 요일)",
    "달력 기반 복용 기록 (완료/미완료)",
    "월별 복용률 통계 자동 계산",
    "복용 예정일 시각적 표시",
    "약물별 용량 관리 (0.25mg ~ 2.4mg)"
]
add_bullet_text(slide7, features, 0.8, 2.4, 5.5, 3, font_size=14, color=BLACK)

# 오른쪽 - 달력 미리보기
add_rounded_rect(slide7, 7, 1.9, 5.5, 4.8, LIGHT_GRAY)
add_text_box(slide7, "2025년 12월 복용률: 85%", 7.2, 2.0, 5, 0.5, font_size=14, color=PRIMARY_DARK, bold=True)

calendar_header = "일    월    화    수    목    금    토"
add_text_box(slide7, calendar_header, 7.3, 2.6, 5, 0.4, font_size=12, color=GRAY)

calendar_data = [
    "1      2      3●    4      5      6      7",
    "8      9     10●   11    12    13    14",
    "15    16    17●   18    19    20    21",
    "22    23    24○   25    26    27    28"
]
for i, row in enumerate(calendar_data):
    add_text_box(slide7, row, 7.3, 3.1 + i * 0.5, 5, 0.4, font_size=12, color=BLACK)

add_text_box(slide7, "● 복용 완료    ○ 복용 예정    ✗ 미복용", 7.3, 5.3, 5, 0.4, font_size=11, color=GRAY)

# 하단 - 응급 상황 감지
add_rectangle(slide7, 0.5, 5.5, 12.3, 1.5, RGBColor(0xFD, 0xED, 0xEC))
add_text_box(slide7, "⚠️ 응급 상황 감지", 0.8, 5.6, 6, 0.4, font_size=16, color=ACCENT, bold=True)
add_text_box(slide7, "\"과다복용\", \"응급\", \"심한 구토\", \"의식 저하\" 등 키워드 감지 시 → \"⚠️ 응급 상황이 의심됩니다. 즉시 119에 전화하거나 가까운 응급실을 방문하세요.\"",
             0.8, 6.1, 11.8, 0.8, font_size=13, color=BLACK)

# ========== 슬라이드 8: 데이터 흐름 ==========
slide8 = prs.slides.add_slide(prs.slide_layouts[6])
add_rectangle(slide8, 0, 0, 13.333, 1.2, PRIMARY_DARK)
add_title_box(slide8, "데이터 흐름", 0.5, 0.3, 12, 0.8, font_size=36, color=WHITE)

# 흐름도
flow_items = [
    ("1", "메시지 입력", "사용자가 채팅창에\n메시지 입력", 0.5),
    ("2", "Intent 분류", "GPT가 메시지의\n의도를 분류", 3),
    ("3", "처리 분기", "log/query/stats/\nanalyze/chat", 5.5),
    ("4", "Function Call", "식단 기록 시\n자동 DB 저장", 8),
    ("5", "응답 생성", "페르소나 적용\n응답 반환", 10.5)
]

for num, title, desc, x in flow_items:
    add_rounded_rect(slide8, x, 1.8, 2.2, 2.2, PRIMARY if num in ["1", "5"] else LIGHT_GRAY)
    color = WHITE if num in ["1", "5"] else BLACK
    add_text_box(slide8, num, x + 0.1, 1.9, 0.4, 0.4, font_size=20, color=color, bold=True)
    add_text_box(slide8, title, x, 2.3, 2.2, 0.5, font_size=14, color=color, bold=True, align=PP_ALIGN.CENTER)
    add_text_box(slide8, desc, x + 0.1, 2.8, 2, 1, font_size=11, color=GRAY if num not in ["1", "5"] else LIGHT_GRAY)

# 화살표
for x in [2.8, 5.3, 7.8, 10.3]:
    add_text_box(slide8, "→", x, 2.5, 0.5, 0.5, font_size=28, color=GRAY)

# 하단 - 컨텍스트 구성
add_text_box(slide8, "AI 컨텍스트 구성", 0.8, 4.3, 6, 0.5, font_size=18, color=PRIMARY_DARK, bold=True)
add_text_box(slide8, "챗봇은 응답 생성 시 다음 사용자 데이터를 자동으로 포함합니다:", 0.8, 4.8, 8, 0.4, font_size=14, color=GRAY)

context_items = [
    ("프로필 정보", "현재 체중: 85kg, 목표 체중: 75kg, 일일 목표: 1800kcal"),
    ("오늘의 식사", "아침 450kcal, 점심 670kcal, 총 1120kcal 섭취"),
    ("체중 기록", "최근 7일 체중 변화: -1.2kg"),
    ("복용 약물", "위고비 0.5mg, 매주 화요일 복용")
]

for i, (label, value) in enumerate(context_items):
    y = 5.3 + i * 0.5
    add_rounded_rect(slide8, 0.8, y, 2, 0.45, PRIMARY)
    add_text_box(slide8, label, 0.9, y + 0.05, 1.8, 0.35, font_size=11, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    add_text_box(slide8, value, 3, y + 0.08, 9.5, 0.35, font_size=12, color=BLACK)

# ========== 슬라이드 9: 기술 스택 상세 ==========
slide9 = prs.slides.add_slide(prs.slide_layouts[6])
add_rectangle(slide9, 0, 0, 13.333, 1.2, PRIMARY_DARK)
add_title_box(slide9, "기술 스택", 0.5, 0.3, 12, 0.8, font_size=36, color=WHITE)

stacks = [
    ("Frontend", [
        ("React 18", "컴포넌트 기반 UI"),
        ("TypeScript", "타입 안정성"),
        ("Tailwind CSS", "유틸리티 스타일링"),
        ("shadcn/ui", "Radix 기반 컴포넌트"),
        ("TanStack Query", "서버 상태 관리")
    ], PRIMARY),
    ("Backend", [
        ("FastAPI", "비동기 Python 서버"),
        ("Supabase", "BaaS (Auth, DB)"),
        ("PostgreSQL", "관계형 데이터베이스"),
        ("JWT", "토큰 기반 인증"),
        ("RLS", "Row Level Security")
    ], RGBColor(0x3E, 0xCF, 0x8E)),
    ("AI / ML", [
        ("GPT-4o-mini", "LLM 추론"),
        ("LlamaIndex", "RAG 프레임워크"),
        ("bge-m3", "임베딩 모델"),
        ("Function Calling", "구조화된 출력"),
        ("Prompt Engineering", "페르소나 설계")
    ], ACCENT)
]

for i, (category, items, color) in enumerate(stacks):
    x = 0.8 + i * 4.2
    add_rounded_rect(slide9, x, 1.5, 3.8, 5.5, LIGHT_GRAY)
    add_rectangle(slide9, x, 1.5, 3.8, 0.7, color)
    add_text_box(slide9, category, x, 1.6, 3.8, 0.5, font_size=18, color=WHITE, bold=True, align=PP_ALIGN.CENTER)

    for j, (tech, desc) in enumerate(items):
        y = 2.4 + j * 0.9
        add_text_box(slide9, tech, x + 0.2, y, 3.4, 0.4, font_size=14, color=BLACK, bold=True)
        add_text_box(slide9, desc, x + 0.2, y + 0.4, 3.4, 0.4, font_size=11, color=GRAY)

# ========== 슬라이드 10: 시연 화면 ==========
slide10 = prs.slides.add_slide(prs.slide_layouts[6])
add_rectangle(slide10, 0, 0, 13.333, 1.2, PRIMARY_DARK)
add_title_box(slide10, "시연 - AI 식단 코칭", 0.5, 0.3, 12, 0.8, font_size=36, color=WHITE)

# 대화 예시
add_rounded_rect(slide10, 0.5, 1.5, 6, 5.5, LIGHT_GRAY)
add_text_box(slide10, "💬 채팅 예시 (밝은 코치)", 0.7, 1.6, 5.5, 0.5, font_size=16, color=PRIMARY_DARK, bold=True)

chat_messages = [
    ("user", "오늘 점심에 비빔밥이랑 된장찌개 먹었어"),
    ("bot", "점심 기록 완료! 😊\n\n비빔밥 550kcal + 된장찌개 120kcal\n총 670kcal 드셨네요.\n\n오늘 총 섭취: 1,120 / 1,800 kcal\n목표까지 680kcal 남았어요!\n\n균형 잡힌 한식 좋아요! 👍"),
    ("user", "저녁 뭐 먹을까?"),
    ("bot", "남은 칼로리가 680kcal이니까...\n\n추천 메뉴:\n• 닭가슴살 샐러드 (350kcal)\n• 두부 스테이크 (280kcal)\n• 연어 포케 (420kcal)\n\n단백질 위주로 드시면 좋겠어요! 💪")
]

y = 2.2
for sender, msg in chat_messages:
    if sender == "user":
        add_rounded_rect(slide10, 3.5, y, 2.8, 0.5, PRIMARY)
        add_text_box(slide10, msg, 3.6, y + 0.08, 2.6, 0.4, font_size=11, color=WHITE)
        y += 0.6
    else:
        lines = msg.count('\n') + 1
        height = 0.2 + lines * 0.22
        add_rounded_rect(slide10, 0.7, y, 3.5, height, WHITE)
        add_text_box(slide10, msg, 0.8, y + 0.08, 3.3, height - 0.1, font_size=10, color=BLACK)
        y += height + 0.15

# 오른쪽 - 기능 설명
add_text_box(slide10, "핵심 기능", 7, 1.5, 5.5, 0.5, font_size=18, color=PRIMARY_DARK, bold=True)

features = [
    ("자연어 식단 기록", "\"비빔밥 먹었어\" → 자동 칼로리 추출"),
    ("실시간 목표 추적", "오늘 섭취량 / 목표 칼로리 표시"),
    ("맞춤 메뉴 추천", "남은 칼로리에 맞는 음식 추천"),
    ("페르소나 응답", "선택한 코치 스타일로 피드백"),
    ("영양소 분석", "단백질/탄수화물/지방 밸런스 체크")
]

for i, (title, desc) in enumerate(features):
    y = 2.0 + i * 1
    add_rounded_rect(slide10, 7, y, 5.5, 0.85, LIGHT_GRAY)
    add_text_box(slide10, title, 7.2, y + 0.1, 5, 0.35, font_size=14, color=PRIMARY_DARK, bold=True)
    add_text_box(slide10, desc, 7.2, y + 0.45, 5, 0.35, font_size=12, color=GRAY)

# ========== 슬라이드 11: 프로젝트 일정 ==========
slide11 = prs.slides.add_slide(prs.slide_layouts[6])
add_rectangle(slide11, 0, 0, 13.333, 1.2, PRIMARY_DARK)
add_title_box(slide11, "프로젝트 일정", 0.5, 0.3, 12, 0.8, font_size=36, color=WHITE)

add_text_box(slide11, "2025.12.04 ~ 2025.12.10 (1주)", 0.8, 1.4, 12, 0.5, font_size=16, color=GRAY)

schedule = [
    ("Day 1\n12/4", "프로젝트 설정", "Supabase 연동\n기본 구조 설계", PRIMARY),
    ("Day 2-3\n12/5-6", "AI 챗봇 개발", "페르소나 시스템\nFunction Calling", PRIMARY),
    ("Day 4\n12/7", "약물 관리", "달력 UI\n복용 스케줄링", RGBColor(0x3E, 0xCF, 0x8E)),
    ("Day 5\n12/8", "RAG 시스템", "문서 수집/임베딩\nFastAPI 서버", ACCENT),
    ("Day 6-7\n12/9-10", "통합/발표", "UI 개선\n최종 테스트", RGBColor(0x95, 0x5B, 0xA5))
]

for i, (day, title, tasks, color) in enumerate(schedule):
    x = 0.6 + i * 2.5
    add_rounded_rect(slide11, x, 1.9, 2.3, 4.5, LIGHT_GRAY)
    add_rectangle(slide11, x, 1.9, 2.3, 1.2, color)
    add_text_box(slide11, day, x, 2.0, 2.3, 0.9, font_size=13, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    add_text_box(slide11, title, x, 3.2, 2.3, 0.5, font_size=14, color=BLACK, bold=True, align=PP_ALIGN.CENTER)
    add_text_box(slide11, tasks, x + 0.2, 3.8, 2, 2, font_size=12, color=GRAY)

# ========== 슬라이드 12: 기대 효과 ==========
slide12 = prs.slides.add_slide(prs.slide_layouts[6])
add_rectangle(slide12, 0, 0, 13.333, 1.2, PRIMARY_DARK)
add_title_box(slide12, "기대 효과", 0.5, 0.3, 12, 0.8, font_size=36, color=WHITE)

effects = [
    ("🍽️ 식단 관리 자동화", "자연어 입력만으로 칼로리/영양소 자동 기록\n→ 기록의 번거로움 해소", PRIMARY),
    ("💊 신뢰할 수 있는 약물 정보", "식약처 공식 문서 기반 RAG로 정확한 정보\n→ 잘못된 정보로 인한 위험 감소", RGBColor(0x3E, 0xCF, 0x8E)),
    ("🤖 개인화된 AI 코칭", "3가지 페르소나로 사용자 성향에 맞는 피드백\n→ 지속적인 동기부여", ACCENT),
    ("📅 체계적인 복용 관리", "달력 기반 주 1회 복용 스케줄 관리\n→ 복용 누락 방지", RGBColor(0x95, 0x5B, 0xA5))
]

for i, (title, desc, color) in enumerate(effects):
    x = 0.5 + (i % 2) * 6.3
    y = 1.5 + (i // 2) * 2.8
    add_rounded_rect(slide12, x, y, 6, 2.5, LIGHT_GRAY)
    add_rectangle(slide12, x, y, 6, 0.7, color)
    add_text_box(slide12, title, x, y + 0.1, 6, 0.5, font_size=18, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    add_text_box(slide12, desc, x + 0.3, y + 0.9, 5.5, 1.4, font_size=14, color=BLACK)

# ========== 슬라이드 13: 향후 계획 ==========
slide13 = prs.slides.add_slide(prs.slide_layouts[6])
add_rectangle(slide13, 0, 0, 13.333, 1.2, PRIMARY_DARK)
add_title_box(slide13, "향후 발전 방향", 0.5, 0.3, 12, 0.8, font_size=36, color=WHITE)

plans = [
    ("🎤 음성 입력 지원", "STT 연동으로 음성 식단 기록"),
    ("🏃 운동 기록 연동", "칼로리 소모량 통합 관리"),
    ("👨‍⚕️ 의료진 연동", "처방 의료진과 데이터 공유"),
    ("📱 모바일 앱", "React Native 크로스플랫폼"),
    ("🔔 푸시 알림", "복용 시간 리마인더"),
    ("📊 고급 분석", "AI 기반 체중 예측 모델")
]

for i, (title, desc) in enumerate(plans):
    x = 0.5 + (i % 3) * 4.2
    y = 1.5 + (i // 3) * 2.8
    add_rounded_rect(slide13, x, y, 3.9, 2.5, LIGHT_GRAY)
    add_text_box(slide13, title, x, y + 0.5, 3.9, 0.6, font_size=18, color=PRIMARY_DARK, bold=True, align=PP_ALIGN.CENTER)
    add_text_box(slide13, desc, x, y + 1.3, 3.9, 0.8, font_size=14, color=GRAY, align=PP_ALIGN.CENTER)

# ========== 슬라이드 14: Q&A ==========
slide14 = prs.slides.add_slide(prs.slide_layouts[6])
add_rectangle(slide14, 0, 0, 13.333, 7.5, PRIMARY_DARK)

add_title_box(slide14, "Q & A", 0, 2.5, 13.333, 1.5, font_size=72, color=WHITE, align=PP_ALIGN.CENTER)
add_text_box(slide14, "감사합니다", 0, 4.2, 13.333, 0.8, font_size=28, color=LIGHT_GRAY, align=PP_ALIGN.CENTER)

add_text_box(slide14, "GitHub: github.com/EHW99/mini_project", 0, 6.2, 13.333, 0.5, font_size=14, color=GRAY, align=PP_ALIGN.CENTER)

# 저장
OUTPUT_PATH = r"c:\Users\djgus\Downloads\DietRx_Coach_발표자료_v2.pptx"
prs.save(OUTPUT_PATH)
print(f"프레젠테이션이 저장되었습니다: {OUTPUT_PATH}")
print(f"총 {len(prs.slides)}개 슬라이드")
