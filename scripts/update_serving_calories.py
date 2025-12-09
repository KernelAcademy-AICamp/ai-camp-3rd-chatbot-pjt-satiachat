"""
식품중량을 기반으로 1인분 칼로리로 변환하여 DB 업데이트
사용법: python scripts/update_serving_calories.py
"""

import csv
import os
import re
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
SUPABASE_KEY = env_vars.get('VITE_SUPABASE_ANON_KEY', '')

CSV_PATH = r'c:\Users\djgus\Downloads\food_data.csv'

# 컬럼명 매핑
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

def extract_number(value: str) -> float | None:
    """문자열에서 숫자만 추출 (예: '590ml' -> 590.0)"""
    if not value:
        return None
    match = re.search(r'[\d.]+', value.strip())
    if match:
        try:
            return float(match.group())
        except ValueError:
            return None
    return None

def parse_numeric(value: str) -> float | None:
    """숫자 문자열을 float으로 변환"""
    if not value or value.strip() == '' or value.strip() == '-':
        return None
    try:
        return float(value.strip().replace(',', ''))
    except ValueError:
        return None

def calculate_serving_nutrition(per_100g: float | None, food_weight_g: float | None) -> float | None:
    """100g당 영양소를 1인분 기준으로 변환"""
    if per_100g is None or food_weight_g is None:
        return per_100g  # 변환 불가시 원본 반환
    return round(per_100g * (food_weight_g / 100), 1)

def process_row(row: dict) -> dict:
    """CSV 행을 1인분 기준으로 변환된 DB 레코드로 변환"""
    food_weight_str = row.get('식품중량', '').strip()
    food_weight_g = extract_number(food_weight_str)

    # 100g당 영양소 값
    calories_per_100g = parse_numeric(row.get('에너지(kcal)', ''))
    protein_per_100g = parse_numeric(row.get('단백질(g)', ''))
    fat_per_100g = parse_numeric(row.get('지방(g)', ''))
    carbs_per_100g = parse_numeric(row.get('탄수화물(g)', ''))
    sugar_per_100g = parse_numeric(row.get('당류(g)', ''))
    fiber_per_100g = parse_numeric(row.get('식이섬유(g)', ''))
    sodium_per_100g = parse_numeric(row.get('나트륨(mg)', ''))

    # 1인분 기준으로 변환
    record = {
        'food_code': row.get('식품코드', '').strip() or None,
        'food_name': row.get('식품명', '').strip() or None,
        'representative_name': row.get('대표식품명', '').strip() or None,
        'category': row.get('식품대분류명', '').strip() or None,
        'calories': calculate_serving_nutrition(calories_per_100g, food_weight_g),
        'protein': calculate_serving_nutrition(protein_per_100g, food_weight_g),
        'fat': calculate_serving_nutrition(fat_per_100g, food_weight_g),
        'carbs': calculate_serving_nutrition(carbs_per_100g, food_weight_g),
        'sugar': calculate_serving_nutrition(sugar_per_100g, food_weight_g),
        'fiber': calculate_serving_nutrition(fiber_per_100g, food_weight_g),
        'sodium': calculate_serving_nutrition(sodium_per_100g, food_weight_g),
        'serving_size': f"1인분({int(food_weight_g)}g)" if food_weight_g else row.get('영양성분함량기준량', '').strip() or None,
        'food_weight': food_weight_str or None,
    }

    return record

def main():
    print(f"CSV 파일 읽는 중: {CSV_PATH}")

    # Supabase 클라이언트 생성
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # 기존 데이터 삭제
    print("기존 데이터 삭제 중...")
    supabase.table('foods').delete().neq('id', 0).execute()

    # CSV 파일 읽기 (CP949 인코딩)
    records = []
    skipped = 0
    with open(CSV_PATH, 'r', encoding='cp949') as f:
        reader = csv.DictReader(f)
        for row in reader:
            record = process_row(row)
            if record.get('food_code') and record.get('food_name'):
                records.append(record)
            else:
                skipped += 1

    print(f"총 {len(records)}개 레코드 로드됨 (스킵: {skipped}개)")

    # 샘플 확인
    print("\n=== 변환 샘플 ===")
    for r in records[:5]:
        print(f"{r['food_name'][:15]:15} | {r['serving_size']:15} | 칼로리: {r['calories']}kcal")
    print()

    # 배치 업로드 (1000개씩)
    BATCH_SIZE = 1000
    total_inserted = 0

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        try:
            supabase.table('foods').upsert(batch, on_conflict='food_code').execute()
            total_inserted += len(batch)
            print(f"진행: {total_inserted}/{len(records)} ({total_inserted * 100 // len(records)}%)")
        except Exception as e:
            print(f"에러 발생 (batch {i // BATCH_SIZE + 1}): {e}")

    print(f"\n완료! 총 {total_inserted}개 레코드가 1인분 기준으로 업데이트되었습니다.")

if __name__ == '__main__':
    main()
