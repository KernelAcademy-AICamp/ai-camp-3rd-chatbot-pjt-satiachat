import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MealCalendar } from './MealCalendar';
import { MonthlyCalorieTrend } from './MonthlyCalorieTrend';
import { DayDetailPanel } from './DayDetailPanel';
import { useMonthlyMeals, useDayMeals } from '@/hooks/useMonthlyMeals';
import { useProfile } from '@/hooks/useProfile';
import { getToday } from '@/lib/supabase';

export function MonthlyMealsView() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: profile } = useProfile();
  const targetCalories = profile?.target_calories || 2000;

  const { data: monthlyData, isLoading: isLoadingMonthly } = useMonthlyMeals(currentYear, currentMonth);
  const { data: dayMeals, isLoading: isLoadingDay } = useDayMeals(selectedDate || '');

  // 이전/다음 달 이동
  const goToPrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((prev) => prev - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((prev) => prev + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
    setSelectedDate(null);
  };

  // 오늘로 이동
  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
    setSelectedDate(getToday());
  };

  // 월간 통계 계산
  const monthStats = {
    totalCalories: monthlyData?.reduce((sum, d) => sum + d.totalCalories, 0) || 0,
    avgCalories: monthlyData?.filter(d => d.totalCalories > 0).length
      ? Math.round(
          (monthlyData?.reduce((sum, d) => sum + d.totalCalories, 0) || 0) /
          (monthlyData?.filter(d => d.totalCalories > 0).length || 1)
        )
      : 0,
    recordedDays: monthlyData?.filter(d => d.totalCalories > 0).length || 0,
  };

  return (
    <div className="space-y-6">
      {/* 월 선택 네비게이션 */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goToPrevMonth} className="rounded-xl">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">
            {currentYear}년 {currentMonth}월
          </h2>
          <Button variant="outline" size="sm" onClick={goToToday} className="rounded-xl text-xs">
            오늘
          </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={goToNextMonth} className="rounded-xl">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* 월간 요약 통계 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">기록된 날</p>
          <p className="text-xl font-bold text-foreground">{monthStats.recordedDays}일</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">일 평균</p>
          <p className="text-xl font-bold text-primary">{monthStats.avgCalories} kcal</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">월 총합</p>
          <p className="text-xl font-bold text-foreground">
            {monthStats.totalCalories >= 10000
              ? `${(monthStats.totalCalories / 1000).toFixed(1)}k`
              : monthStats.totalCalories} kcal
          </p>
        </div>
      </div>

      {/* 캘린더 */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">식단 캘린더</h3>
        </div>
        <MealCalendar
          year={currentYear}
          month={currentMonth}
          dailyData={monthlyData || []}
          selectedDate={selectedDate || undefined}
          onSelectDate={setSelectedDate}
          targetCalories={targetCalories}
        />
      </div>

      {/* 선택된 날짜 상세 패널 */}
      {selectedDate && (
        <DayDetailPanel
          date={selectedDate}
          meals={dayMeals}
          isLoading={isLoadingDay}
          onClose={() => setSelectedDate(null)}
        />
      )}

      {/* 월간 칼로리 트렌드 */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">월간 칼로리 추이</h3>
        </div>
        <MonthlyCalorieTrend dailyData={monthlyData || []} isLoading={isLoadingMonthly} />
      </div>
    </div>
  );
}
