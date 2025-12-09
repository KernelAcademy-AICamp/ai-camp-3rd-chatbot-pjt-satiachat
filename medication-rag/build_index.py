"""
LlamaIndex 벡터 인덱스 빌더
수집된 문서를 임베딩하여 RAG용 인덱스 생성
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# .env.local 로드
PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / ".env.local")

from llama_index.core import (
    SimpleDirectoryReader,
    VectorStoreIndex,
    StorageContext,
    Settings,
)
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.llms.openai import OpenAI

# Paths
BASE_DIR = Path(__file__).parent
DOCS_DIR = BASE_DIR / "docs"
STORAGE_DIR = BASE_DIR / "storage"


def build_index():
    """문서 로드 및 인덱스 빌드"""

    print("=" * 50)
    print("Building Medication RAG Index")
    print("=" * 50)

    # 1. 임베딩 모델 설정 (한국어 지원 다국어 모델)
    print("\n[1/4] Loading embedding model...")
    Settings.embed_model = HuggingFaceEmbedding(
        model_name="BAAI/bge-m3",  # 다국어 지원, 한국어 성능 좋음
    )

    # 2. LLM 설정
    print("[2/4] Configuring LLM...")
    Settings.llm = OpenAI(
        model="gpt-4o-mini",
        temperature=0.1,
    )

    # 3. 문서 로드
    print(f"[3/4] Loading documents from {DOCS_DIR}...")

    if not DOCS_DIR.exists():
        raise FileNotFoundError(f"Docs directory not found: {DOCS_DIR}")

    # .txt 파일만 로드 (manifest.json 제외)
    documents = SimpleDirectoryReader(
        input_dir=str(DOCS_DIR),
        required_exts=[".txt"],
        recursive=False,
    ).load_data()

    print(f"  Loaded {len(documents)} documents")

    for doc in documents:
        filename = doc.metadata.get("file_name", "unknown")
        print(f"    - {filename}: {len(doc.text)} chars")

    # 4. 인덱스 빌드
    print("[4/4] Building vector index...")

    index = VectorStoreIndex.from_documents(
        documents,
        show_progress=True,
    )

    # 5. 저장
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    index.storage_context.persist(persist_dir=str(STORAGE_DIR))

    print(f"\n{'='*50}")
    print(f"Index saved to: {STORAGE_DIR}")
    print(f"{'='*50}")


if __name__ == "__main__":
    build_index()
