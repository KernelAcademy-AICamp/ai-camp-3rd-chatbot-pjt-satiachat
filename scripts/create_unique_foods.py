"""
중복 제거된 foods 테이블 생성
같은 food_name은 최빈 중량 기준으로 통합
"""

import csv
import os
import re
import sys
from collections import defaultdict, Counter
from supabase import create_client, Client

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

def extract_number(value: str) -> float | None:
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
    if not value or value.strip() == '' or value.strip() == '-':
        return None
    try:
        return float(value.strip().replace(',', ''))
    except ValueError:
        return None

def main():
    print(f"CSV 파일 읽는 중: {CSV_PATH}")

    # food_name 기준으로 그룹화
    food_groups = defaultdict(list)

    with open(CSV_PATH, 'r', encoding='cp949') as f:
        reader = csv.DictReader(f)
        for row in reader:
            food_name = row.get('식품명', '').strip()
            if not food_name:
                continue

            food_weight_g = extract_number(row.get('식품중량', ''))

            # 100g당 값을 1인분으로 변환
            def to_serving(val_str):
                val = parse_numeric(val_str)
                if val is None or food_weight_g is None:
                    return val
                return val * (food_weight_g / 100)

            food_groups[food_name].append({
                'food_code': row.get('식품코드', '').strip(),
                'representative_name': row.get('대표식품명', '').strip(),
                'category': row.get('식품대분류명', '').strip(),
                'calories': to_serving(row.get('에너지(kcal)', '')),
                'protein': to_serving(row.get('단백질(g)', '')),
                'fat': to_serving(row.get('지방(g)', '')),
                'carbs': to_serving(row.get('탄수화물(g)', '')),
                'sugar': to_serving(row.get('당류(g)', '')),
                'fiber': to_serving(row.get('식이섬유(g)', '')),
                'sodium': to_serving(row.get('나트륨(mg)', '')),
                'food_weight_g': food_weight_g,
                'serving_size_raw': row.get('영양성분함량기준량', '').strip(),
            })

    print(f"총 {len(food_groups)}개 고유 음식명 발견 (원본 {sum(len(v) for v in food_groups.values())}개)")

    # 최빈값 방식: 가장 많이 등장하는 중량 기준으로 선택
    records = []
    for food_name, items in food_groups.items():
        weights = [item['food_weight_g'] for item in items if item['food_weight_g'] is not None]

        if weights:
            # 최빈 중량 찾기
            weight_counter = Counter(weights)
            most_common_weight = weight_counter.most_common(1)[0][0]

            # 해당 중량을 가진 항목들만 필터링
            matching_items = [item for item in items if item['food_weight_g'] == most_common_weight]
        else:
            matching_items = items
            most_common_weight = None

        # 필터링된 항목들의 평균값 계산
        def avg_field(field):
            values = [item[field] for item in matching_items if item[field] is not None]
            if not values:
                return None
            return round(sum(values) / len(values), 1)

        records.append({
            'food_code': matching_items[0]['food_code'],
            'food_name': food_name,
            'representative_name': matching_items[0]['representative_name'] or None,
            'category': matching_items[0]['category'] or None,
            'calories': avg_field('calories'),
            'protein': avg_field('protein'),
            'fat': avg_field('fat'),
            'carbs': avg_field('carbs'),
            'sugar': avg_field('sugar'),
            'fiber': avg_field('fiber'),
            'sodium': avg_field('sodium'),
            'serving_size': f"1인분({int(most_common_weight)}g)" if most_common_weight else matching_items[0]['serving_size_raw'] or None,
            'food_weight': f"{int(most_common_weight)}g" if most_common_weight else None,
        })

    print(f"\n=== 샘플 데이터 ===")
    for r in records[:5]:
        print(f"{r['food_name'][:20]:20} | {r['serving_size'] or 'N/A':15} | {r['calories']}kcal")

    # Supabase 업로드
    print(f"\nSupabase 업로드 중...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # 기존 데이터 삭제
    print("기존 foods 테이블 데이터 삭제 중...")
    supabase.table('foods').delete().neq('id', 0).execute()

    # 배치 업로드
    BATCH_SIZE = 1000
    total_inserted = 0

    for i in range(0, len(records), BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        try:
            supabase.table('foods').insert(batch).execute()
            total_inserted += len(batch)
            print(f"진행: {total_inserted}/{len(records)} ({total_inserted * 100 // len(records)}%)")
        except Exception as e:
            print(f"에러 (batch {i // BATCH_SIZE + 1}): {e}")

    print(f"\n완료! {total_inserted}개 고유 음식 데이터가 저장되었습니다.")
    print(f"(원본 14,584개 → 중복 제거 후 {len(records)}개)")

if __name__ == '__main__':
    main()
