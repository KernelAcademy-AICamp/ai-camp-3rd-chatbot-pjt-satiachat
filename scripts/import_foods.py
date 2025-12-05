"""
CSV 음식 데이터를 Supabase에 업로드하는 스크립트
사용법: python scripts/import_foods.py [--service-key YOUR_SERVICE_KEY]
"""

import csv
import os
import sys
from supabase import create_client, Client

# .env.local 파일에서 Supabase 설정 읽기
def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key] = value
    return env_vars

env_vars = load_env()
SUPABASE_URL = env_vars.get('VITE_SUPABASE_URL', '')

# Service key를 커맨드라인 인자로 받거나 anon key 사용
if len(sys.argv) > 2 and sys.argv[1] == '--service-key':
    SUPABASE_KEY = sys.argv[2]
    print("Service Role Key 사용")
else:
    SUPABASE_KEY = env_vars.get('VITE_SUPABASE_ANON_KEY', '')
    print("Anon Key 사용 (RLS bypass 필요시 --service-key 옵션 사용)")

# CSV 파일 경로
CSV_PATH = r'c:\Users\djgus\Downloads\food_data.csv'

# CSV 컬럼명 -> DB 컬럼명 매핑
COLUMN_MAPPING = {
    '식품코드': 'food_code',
    '식품명': 'food_name',
    '대표식품명': 'representative_name',
    '식품대분류명': 'category',
    '에너지(kcal)': 'calories',
    '단백질(g)': 'protein',
    '지방(g)': 'fat',
    '탄수화물(g)': 'carbs',
    '당류(g)': 'sugar',
    '식이섬유(g)': 'fiber',
    '나트륨(mg)': 'sodium',
    '영양성분함량기준량': 'serving_size',
    '식품중량': 'food_weight',
}

def parse_numeric(value: str) -> float | None:
    """숫자 문자열을 float으로 변환, 빈 값은 None 반환"""
    if not value or value.strip() == '' or value.strip() == '-':
        return None
    try:
        return float(value.strip().replace(',', ''))
    except ValueError:
        return None

def process_row(row: dict) -> dict:
    """CSV 행을 DB 레코드로 변환"""
    record = {}

    for csv_col, db_col in COLUMN_MAPPING.items():
        value = row.get(csv_col, '').strip()

        # 숫자 컬럼 처리
        if db_col in ['calories', 'protein', 'fat', 'carbs', 'sugar', 'fiber', 'sodium']:
            record[db_col] = parse_numeric(value)
        else:
            record[db_col] = value if value else None

    return record

def main():
    print(f"CSV 파일 읽는 중: {CSV_PATH}")

    # Supabase 클라이언트 생성
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # CSV 파일 읽기 (CP949 인코딩)
    records = []
    with open(CSV_PATH, 'r', encoding='cp949') as f:
        reader = csv.DictReader(f)
        for row in reader:
            record = process_row(row)
            # food_code와 food_name이 있는 경우만 추가
            if record.get('food_code') and record.get('food_name'):
                records.append(record)

    print(f"총 {len(records)}개 레코드 로드됨")

    # 배치 업로드 (1000개씩)
    BATCH_SIZE = 1000
    total_inserted = 0

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        try:
            result = supabase.table('foods').upsert(batch, on_conflict='food_code').execute()
            total_inserted += len(batch)
            print(f"진행: {total_inserted}/{len(records)} ({total_inserted * 100 // len(records)}%)")
        except Exception as e:
            print(f"에러 발생 (batch {i // BATCH_SIZE + 1}): {e}")
            # 에러 발생 시 개별 삽입 시도
            for record in batch:
                try:
                    supabase.table('foods').upsert(record, on_conflict='food_code').execute()
                    total_inserted += 1
                except Exception as e2:
                    print(f"  개별 레코드 에러: {record.get('food_name')} - {e2}")

    print(f"\n완료! 총 {total_inserted}개 레코드가 업로드되었습니다.")

if __name__ == '__main__':
    main()
