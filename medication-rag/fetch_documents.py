"""
MFDS 의약품 문서 수집기
nedrug.mfds.go.kr에서 위고비/마운자로 정보를 XML로 다운로드
"""

import httpx
import os
from pathlib import Path
from bs4 import BeautifulSoup
import json

BASE_URL = "https://nedrug.mfds.go.kr"
DOCS_DIR = Path(__file__).parent / "docs"

# 수집할 약품 목록
MEDICATIONS = {
    "wegovy": {
        "name": "위고비 (세마글루티드)",
        "cache_seq": "202301386",
        "sections": ["EE", "UD", "NB"]  # 효능효과, 용법용량, 주의사항
    },
    "mounjaro": {
        "name": "마운자로 (터제파타이드)",
        "cache_seq": "202301983",
        "sections": ["EE", "UD", "NB"]
    }
}

SECTION_NAMES = {
    "EE": "효능효과",
    "UD": "용법용량",
    "NB": "주의사항"
}


def fetch_xml(cache_seq: str, section: str) -> str:
    """XML 문서 다운로드"""
    url = f"{BASE_URL}/pbp/cmn/xml/drb/{cache_seq}/{section}"
    print(f"  Fetching: {url}")

    response = httpx.get(url, timeout=30.0, follow_redirects=True)
    response.raise_for_status()
    return response.text


def fetch_html(cache_seq: str, section: str) -> str:
    """HTML 문서 다운로드 (백업용)"""
    url = f"{BASE_URL}/pbp/cmn/html/drb/{cache_seq}/{section}"
    print(f"  Fetching HTML: {url}")

    response = httpx.get(url, timeout=30.0, follow_redirects=True)
    response.raise_for_status()
    return response.text


def parse_xml_to_text(xml_content: str) -> str:
    """XML에서 텍스트 추출 (HTML 태그도 제거)"""
    import re

    # 1차: XML 파싱
    soup = BeautifulSoup(xml_content, "lxml-xml")
    text = soup.get_text(separator="\n", strip=True)

    # 2차: 남아있는 HTML 태그 제거
    soup2 = BeautifulSoup(text, "html.parser")
    text = soup2.get_text(separator="\n", strip=True)

    # HTML 엔티티 정리
    text = text.replace("&nbsp;", " ")
    text = text.replace("&lt;", "<")
    text = text.replace("&gt;", ">")
    text = text.replace("&amp;", "&")

    # sup/sub 태그 내용 정리 (예: <sup>2</sup> -> ²)
    text = re.sub(r'<sup>2</sup>', '²', text)
    text = re.sub(r'<sup>(\d+)</sup>', r'^(\1)', text)
    text = re.sub(r'<[^>]+>', '', text)  # 나머지 태그 제거

    # 빈 줄 정리
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    return "\n".join(lines)


def parse_html_to_text(html_content: str) -> str:
    """HTML에서 텍스트 추출"""
    soup = BeautifulSoup(html_content, "html.parser")

    # 스크립트, 스타일 제거
    for tag in soup(["script", "style"]):
        tag.decompose()

    text = soup.get_text(separator="\n", strip=True)
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    return "\n".join(lines)


def save_document(med_id: str, med_name: str, section: str, content: str):
    """문서 저장"""
    filename = f"{med_id}_{section}.txt"
    filepath = DOCS_DIR / filename

    # 메타데이터 헤더 추가
    header = f"""# {med_name} - {SECTION_NAMES.get(section, section)}
# 출처: 식품의약품안전처 의약품안전나라 (nedrug.mfds.go.kr)
# 수집일: {__import__('datetime').datetime.now().strftime('%Y-%m-%d')}

"""

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(header + content)

    print(f"  Saved: {filepath}")
    return filepath


def main():
    """메인 수집 함수"""
    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    collected_files = []

    for med_id, med_info in MEDICATIONS.items():
        print(f"\n{'='*50}")
        print(f"Collecting: {med_info['name']}")
        print(f"{'='*50}")

        for section in med_info["sections"]:
            section_name = SECTION_NAMES.get(section, section)
            print(f"\n[{section_name}]")

            try:
                # XML 먼저 시도
                xml_content = fetch_xml(med_info["cache_seq"], section)
                text_content = parse_xml_to_text(xml_content)

                if len(text_content) < 100:
                    # XML이 비어있으면 HTML 시도
                    print("  XML empty, trying HTML...")
                    html_content = fetch_html(med_info["cache_seq"], section)
                    text_content = parse_html_to_text(html_content)

                filepath = save_document(med_id, med_info["name"], section, text_content)
                collected_files.append(str(filepath))
                print(f"  Content length: {len(text_content)} chars")

            except Exception as e:
                print(f"  Error: {e}")

    # 수집 결과 저장
    manifest = {
        "medications": MEDICATIONS,
        "files": collected_files,
        "total_files": len(collected_files)
    }

    with open(DOCS_DIR / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*50}")
    print(f"Collection complete! {len(collected_files)} files saved.")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
