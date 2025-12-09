import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isFuture } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, TrendingUp, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMedicationLogsForMonth, type DayLogSummary } from "@/hooks/useMedications";
import { MedicationDayDetail } from "./MedicationDayDetail";
import type { MedicationWithLogs } from "@/types/domain";

interface MedicationCalendarProps {
  medications: MedicationWithLogs[];
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function MedicationCalendar({ medications }: MedicationCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: monthData, isLoading } = useMedicationLogsForMonth(year, month);

  // 달력에 표시할 날짜 배열 생성
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });

    // 시작 요일에 맞춰 빈 칸 추가
    const startDayOfWeek = start.getDay();
    const emptyDays = Array(startDayOfWeek).fill(null);

    return [...emptyDays, ...days];
  }, [currentDate]);

  // 이전/다음 달 이동
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  // 날짜별 상태 가져오기
  const getDayStatus = (date: Date): DayLogSummary | null => {
    if (!monthData) return null;
    const dateStr = format(date, "yyyy-MM-dd");
    return monthData.dailySummary.get(dateStr) || null;
  };

  // 상태에 따른 스타일
  const getStatusStyle = (status: string | undefined) => {
    switch (status) {
      case "full":
        return "bg-success text-success-foreground";
      case "partial":
        return "bg-warning text-warning-foreground";
      case "missed":
        return "bg-destructive/20 text-destructive";
      default:
        return "";
    }
  };

  // 상태 인디케이터
  const getStatusIndicator = (status: string | undefined) => {
    switch (status) {
      case "full":
        return <div className="w-1.5 h-1.5 rounded-full bg-success" />;
      case "partial":
        return <div className="w-1.5 h-1.5 rounded-full bg-warning" />;
      case "missed":
        return <div className="w-1.5 h-1.5 rounded-full bg-destructive" />;
      default:
        return null;
    }
  };

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  return (
    <div className="space-y-6">
      {/* 월별 통계 카드 */}
      {monthData && (
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl border border-primary/20 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {format(currentDate, "yyyy년 M월", { locale: ko })} 복용률
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">
                    {monthData.monthStats.averageRate}%
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({monthData.monthStats.fullComplianceDays}/{monthData.monthStats.recordedDays}일 완벽 복용)
                  </span>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="text-muted-foreground">전체 복용</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span className="text-muted-foreground">일부 복용</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span className="text-muted-foreground">미복용</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 달력 */}
        <div className="bg-card rounded-3xl border border-border/50 p-6 shadow-lg">
          {/* 달력 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousMonth}
              className="rounded-xl"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold text-foreground">
              {format(currentDate, "yyyy년 M월", { locale: ko })}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextMonth}
              className="rounded-xl"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS.map((day, index) => (
                  <div
                    key={day}
                    className={cn(
                      "text-center text-sm font-medium py-2",
                      index === 0 ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* 날짜 그리드 */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const dayStatus = getDayStatus(date);
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  const isTodayDate = isToday(date);
                  const isFutureDate = isFuture(date);
                  const dayOfWeek = date.getDay();

                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => setSelectedDate(date)}
                      disabled={isFutureDate}
                      className={cn(
                        "aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-sm",
                        "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50",
                        isSelected && "ring-2 ring-primary bg-primary/10",
                        isTodayDate && !isSelected && "bg-accent",
                        isFutureDate && "opacity-30 cursor-not-allowed",
                        dayOfWeek === 0 && "text-destructive"
                      )}
                    >
                      <span
                        className={cn(
                          "font-medium",
                          isSelected && "text-primary"
                        )}
                      >
                        {format(date, "d")}
                      </span>
                      {!isFutureDate && getStatusIndicator(dayStatus?.status)}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* 모바일용 범례 */}
          <div className="flex sm:hidden justify-center gap-4 mt-4 pt-4 border-t border-border/50 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-muted-foreground">완료</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-muted-foreground">일부</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              <span className="text-muted-foreground">미복용</span>
            </div>
          </div>
        </div>

        {/* 날짜별 상세 */}
        <div className="bg-card rounded-3xl border border-border/50 p-6 shadow-lg">
          {selectedDate ? (
            <MedicationDayDetail
              date={selectedDateStr!}
              medications={medications}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <CalendarIcon className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                달력에서 날짜를 선택하면<br />복용 기록을 확인할 수 있습니다
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
