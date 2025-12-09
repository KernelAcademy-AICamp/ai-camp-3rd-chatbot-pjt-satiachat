import { useState } from "react";
import {
  Pill, Plus, Calendar, History,
  Bell, Loader2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MedicationCard } from "@/components/medications/MedicationCard";
import { MedicationForm } from "@/components/medications/MedicationForm";
import { MedicationCalendar } from "@/components/medications/MedicationCalendar";
import { HealthSummaryCard } from "@/components/medications/HealthSummaryCard";
import { MedicationChatPanel } from "@/components/medications/MedicationChatPanel";
import { FloatingChatButton } from "@/components/ui/FloatingChatButton";
import { useTodayMedicationStats } from "@/hooks/useMedications";
import type { DayOfWeek } from "@/types/domain";

type ViewTab = "today" | "history";

const DAY_LABELS: Record<DayOfWeek, string> = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
};

export default function Medications() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeView, setActiveView] = useState<ViewTab>("today");
  const [showMobileChat, setShowMobileChat] = useState(false);

  const { total, taken, percentage, medications, isLoading, error } = useTodayMedicationStats();

  // 오늘 요일
  const todayDayOfWeek = new Date().getDay() as DayOfWeek;

  // 오늘 복용 예정 약물 (dose_day === 오늘 요일)
  const todayMeds = medications.filter((m) => {
    const doseDay = m.dose_day as DayOfWeek | undefined;
    return doseDay === undefined || doseDay === todayDayOfWeek;
  });

  // 다른 날 예정 약물 (dose_day !== 오늘 요일)
  const scheduledMeds = medications.filter((m) => {
    const doseDay = m.dose_day as DayOfWeek | undefined;
    return doseDay !== undefined && doseDay !== todayDayOfWeek;
  });

  // 오늘 복용 대기/완료 분류
  const pendingTodayMeds = todayMeds.filter((m) => !m.medication_logs?.length);
  const completedTodayMeds = todayMeds.filter((m) => m.medication_logs?.length > 0);

  // 통계는 오늘 복용 예정 약물 기준
  const todayTotal = todayMeds.length;
  const todayTaken = completedTodayMeds.length;
  const todayPercentage = todayTotal > 0 ? Math.round((todayTaken / todayTotal) * 100) : 100;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* 왼쪽: 메인 콘텐츠 */}
      <div className="flex-1 p-4 md:p-6 lg:p-8">
          {/* 헤더 */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                    <Pill className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">Medications</h1>
                    <p className="text-muted-foreground text-sm">주간 복용 현황을 확인하세요</p>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => setShowAddForm(true)}
                className="gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 px-6"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">약물 추가</span>
              </Button>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex gap-1 mb-6 p-1 bg-muted/50 rounded-xl w-fit">
            {[
              { id: "today" as ViewTab, label: "오늘", icon: Calendar },
              { id: "history" as ViewTab, label: "기록", icon: History },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  activeView === tab.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* 오늘 탭 */}
          {activeView === "today" && (
            <>
              {/* 로딩 상태 */}
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}

              {/* 에러 상태 */}
              {error && (
                <div className="bg-destructive/10 text-destructive rounded-xl p-4 text-center mb-6">
                  <p>약물 데이터를 불러오는데 실패했습니다.</p>
                  <p className="text-sm mt-1">Supabase 연결을 확인해주세요.</p>
                </div>
              )}

              {!isLoading && !error && (
                <>
                  {/* 진행 현황 카드 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {/* 오늘의 복용 현황 */}
                    <div className="md:col-span-2 bg-gradient-to-br from-card to-card/80 rounded-3xl border border-border/50 p-6 shadow-lg">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">
                            오늘의 복용 현황 ({DAY_LABELS[todayDayOfWeek]}요일)
                          </p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-foreground">{todayTaken}</span>
                            <span className="text-xl text-muted-foreground">/ {todayTotal}</span>
                          </div>
                        </div>
                        {/* 원형 프로그레스 */}
                        <div className="relative w-24 h-24">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke="hsl(var(--muted))"
                              strokeWidth="12"
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke="hsl(var(--primary))"
                              strokeWidth="12"
                              strokeLinecap="round"
                              strokeDasharray={`${todayTotal > 0 ? (todayTaken / todayTotal) * 251.2 : 251.2} 251.2`}
                              className="transition-all duration-500"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-bold text-primary">
                              {todayPercentage}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 프로그레스 바 */}
                      {todayTotal > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">복용 완료</span>
                            <span className="text-success font-medium">{completedTodayMeds.length}개</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-success to-success/70 rounded-full transition-all duration-500"
                              style={{ width: todayTotal > 0 ? `${(completedTodayMeds.length / todayTotal) * 100}%` : "0%" }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">대기 중</span>
                            <span className="text-warning font-medium">{pendingTodayMeds.length}개</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-warning to-warning/70 rounded-full transition-all duration-500"
                              style={{ width: todayTotal > 0 ? `${(pendingTodayMeds.length / todayTotal) * 100}%` : "0%" }}
                            />
                          </div>
                        </div>
                      )}

                      {todayTotal === 0 && medications.length > 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          오늘은 복용 예정인 약물이 없습니다
                        </p>
                      )}
                    </div>

                    {/* 건강 요약 (체중/칼로리) */}
                    <div className="h-full">
                      <HealthSummaryCard />
                    </div>
                  </div>

                  {/* 빈 상태 */}
                  {medications.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Pill className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">등록된 약물이 없습니다</p>
                      <p className="text-sm">위의 "약물 추가" 버튼을 눌러 약물을 추가해보세요!</p>
                    </div>
                  )}

                  {/* 복용 대기 (오늘) */}
                  {pendingTodayMeds.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                        <h2 className="text-lg font-semibold text-foreground">복용 대기</h2>
                        <span className="text-sm text-muted-foreground">({pendingTodayMeds.length})</span>
                      </div>
                      <div className="space-y-3">
                        {pendingTodayMeds.map((med, index) => (
                          <MedicationCard
                            key={med.id}
                            medication={med}
                            animationDelay={index * 0.1}
                            isScheduledToday={true}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 복용 완료 (오늘) */}
                  {completedTodayMeds.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-success" />
                        <h2 className="text-lg font-semibold text-foreground">복용 완료</h2>
                        <span className="text-sm text-muted-foreground">({completedTodayMeds.length})</span>
                      </div>
                      <div className="space-y-3">
                        {completedTodayMeds.map((med, index) => (
                          <MedicationCard
                            key={med.id}
                            medication={med}
                            animationDelay={index * 0.1}
                            completed
                            isScheduledToday={true}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 예정된 약물 (다른 요일) */}
                  {scheduledMeds.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 rounded-full bg-info" />
                        <h2 className="text-lg font-semibold text-foreground">예정된 복용</h2>
                        <span className="text-sm text-muted-foreground">({scheduledMeds.length})</span>
                      </div>
                      <div className="space-y-3">
                        {scheduledMeds.map((med, index) => (
                          <MedicationCard
                            key={med.id}
                            medication={med}
                            animationDelay={index * 0.1}
                            isScheduledToday={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 알림 배너 */}
                  <div className="mt-8 flex items-center gap-4 p-4 bg-gradient-to-r from-info/10 to-info/5 border border-info/20 rounded-2xl">
                    <div className="w-12 h-12 rounded-xl bg-info/20 flex items-center justify-center flex-shrink-0">
                      <Bell className="w-6 h-6 text-info" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">알림 설정</p>
                      <p className="text-sm text-muted-foreground">
                        곧 추가될 기능입니다
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl border-info/30 text-info hover:bg-info/10">
                      설정하기
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {/* 기록 탭 - 달력 뷰 */}
          {activeView === "history" && (
            <MedicationCalendar medications={medications} />
          )}
      </div>

      {/* 오른쪽: AI 챗봇 패널 (데스크톱) */}
      <div className="hidden lg:block w-[420px] border-l border-border p-4 bg-muted/20">
        <div className="h-[calc(100vh-2rem)] sticky top-4">
          <MedicationChatPanel />
        </div>
      </div>

      {/* 플로팅 챗봇 버튼 (모바일) */}
      <FloatingChatButton
        isOpen={showMobileChat}
        onClick={() => setShowMobileChat(!showMobileChat)}
        className="bg-gradient-to-br from-info to-info/80 shadow-lg shadow-info/30"
      />

      {/* 모바일 챗봇 모달 */}
      {showMobileChat && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* 백드롭 */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobileChat(false)}
          />
          {/* 챗봇 패널 */}
          <div className="absolute top-4 left-4 right-4 bottom-20 md:top-8 md:left-8 md:right-8 md:bottom-8 bg-background rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="relative flex-1 flex flex-col min-h-0">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 z-10 rounded-xl"
                onClick={() => setShowMobileChat(false)}
              >
                <X className="w-5 h-5" />
              </Button>
              <MedicationChatPanel />
            </div>
          </div>
        </div>
      )}

      {/* 약물 추가 폼 */}
      <MedicationForm
        open={showAddForm}
        onOpenChange={setShowAddForm}
      />
    </div>
  );
}
