import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { getToday } from '@/lib/supabase';
import type { MonthlyMealData } from '@/hooks/useMonthlyMeals';

interface MealCalendarProps {
  year: number;
  month: number; // 1-12
  dailyData: MonthlyMealData[];
  selectedDate?: string;
  onSelectDate: (date: string) => void;
  targetCalories?: number;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function MealCalendar({
  year,
  month,
  dailyData,
  selectedDate,
  onSelectDate,
  targetCalories = 2000,
}: MealCalendarProps) {
  // 달력 그리드 데이터 계산
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    // 날짜별 데이터 맵
    const dataMap: Record<string, MonthlyMealData> = {};
    dailyData.forEach((d) => {
      dataMap[d.date] = d;
    });

    const days: (MonthlyMealData | null)[] = [];

    // 이전 달 빈 칸
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // 현재 달 날짜들
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push(dataMap[dateStr] || {
        date: dateStr,
        totalCalories: 0,
        mealCount: 0,
        targetCalories,
      });
    }

    return days;
  }, [year, month, dailyData, targetCalories]);

  // 오늘 날짜
  const today = getToday();

  // 색상 결정 함수
  const getColorClass = (data: MonthlyMealData) => {
    if (data.totalCalories === 0) {
      return 'bg-muted/30 text-muted-foreground';
    }
    const ratio = data.totalCalories / targetCalories;
    if (ratio <= 0.85) {
      return 'bg-success/10 text-success';
    }
    if (ratio <= 1.1) {
      return 'bg-primary/10 text-primary';
    }
    return 'bg-warning/10 text-warning';
  };

  return (
    <div className="w-full">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAYS.map((day, idx) => (
          <div
            key={day}
            className={cn(
              'text-center text-xs font-medium py-2',
              idx === 0 ? 'text-red-400' : idx === 6 ? 'text-blue-400' : 'text-muted-foreground'
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const dayNum = parseInt(day.date.split('-')[2], 10);
          const isToday = day.date === today;
          const isSelected = day.date === selectedDate;
          const dayOfWeek = (idx % 7);

          return (
            <button
              key={day.date}
              onClick={() => onSelectDate(day.date)}
              className={cn(
                'aspect-square p-1 rounded-lg transition-all flex flex-col items-center justify-center gap-0.5',
                'hover:ring-2 hover:ring-primary/50 focus:outline-none focus:ring-2 focus:ring-primary',
                getColorClass(day),
                isToday && 'ring-2 ring-primary',
                isSelected && 'ring-2 ring-primary bg-primary/20'
              )}
              aria-label={`${month}월 ${dayNum}일, ${day.totalCalories}kcal`}
              aria-pressed={isSelected}
            >
              <span
                className={cn(
                  'text-xs font-medium',
                  dayOfWeek === 0 ? 'text-red-400' : dayOfWeek === 6 ? 'text-blue-400' : '',
                  isSelected && 'text-primary'
                )}
              >
                {dayNum}
              </span>
              {day.totalCalories > 0 ? (
                <>
                  <span className="text-[10px] sm:text-xs font-bold leading-none">
                    {day.totalCalories >= 1000
                      ? `${(day.totalCalories / 1000).toFixed(1)}k`
                      : day.totalCalories}
                  </span>
                  <span className="text-[8px] sm:text-[10px] opacity-70 leading-none">
                    {day.mealCount}끼
                  </span>
                </>
              ) : (
                <span className="text-[10px] opacity-50">-</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-success/30" />
          <span>미달</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-primary/30" />
          <span>적정</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm bg-warning/30" />
          <span>초과</span>
        </div>
      </div>
    </div>
  );
}
