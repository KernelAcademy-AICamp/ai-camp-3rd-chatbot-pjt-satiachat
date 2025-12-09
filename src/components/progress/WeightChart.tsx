import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { useWeeklyProgress, useProgressByRange } from '@/hooks/useProgress';
import { cn } from '@/lib/utils';

interface WeightChartProps {
  targetWeight?: number;
  startDate?: string;
  endDate?: string;
  viewMode?: 'weekly' | 'monthly';
}

type ChartMetric = 'weight' | 'bodyFat' | 'muscle';

export function WeightChart({ targetWeight, startDate, endDate, viewMode = 'weekly' }: WeightChartProps) {
  const [activeMetrics, setActiveMetrics] = useState<Set<ChartMetric>>(new Set(['weight']));

  // 기간이 지정되면 해당 기간 데이터, 아니면 최근 7일
  const weeklyQuery = useWeeklyProgress();
  const rangeQuery = useProgressByRange(startDate || '', endDate || '');

  const { data: logs, isLoading, error } = startDate && endDate ? rangeQuery : weeklyQuery;

  const chartData = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    return logs.map(log => ({
      date: viewMode === 'monthly'
        ? new Date(log.date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
        : new Date(log.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
      fullDate: log.date,
      weight: log.weight_kg,
      bodyFat: log.body_fat_percent,
      muscle: log.muscle_mass_kg,
      target: targetWeight,
    }));
  }, [logs, targetWeight, viewMode]);

  const toggleMetric = (metric: ChartMetric) => {
    setActiveMetrics(prev => {
      const next = new Set(prev);
      if (next.has(metric)) {
        // 최소 하나는 선택되어야 함
        if (next.size > 1) {
          next.delete(metric);
        }
      } else {
        next.add(metric);
      }
      return next;
    });
  };

  // 데이터에 체지방/근육량이 있는지 확인
  const hasBodyFatData = chartData.some(d => d.bodyFat != null);
  const hasMuscleData = chartData.some(d => d.muscle != null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>차트 데이터를 불러올 수 없습니다</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">아직 기록이 없습니다</p>
          <p className="text-sm">체중을 기록하면 여기에 그래프가 표시됩니다</p>
        </div>
      </div>
    );
  }

  // Calculate Y-axis domain based on active metrics
  const getYAxisDomain = () => {
    const values: number[] = [];

    if (activeMetrics.has('weight')) {
      values.push(...chartData.map(d => d.weight).filter(Boolean));
      if (targetWeight) values.push(targetWeight);
    }
    if (activeMetrics.has('muscle')) {
      values.push(...chartData.map(d => d.muscle).filter(Boolean));
    }
    if (activeMetrics.has('bodyFat')) {
      values.push(...chartData.map(d => d.bodyFat).filter(Boolean));
    }

    if (values.length === 0) return [0, 100];

    const min = Math.floor(Math.min(...values) - 2);
    const max = Math.ceil(Math.max(...values) + 2);
    return [min, max];
  };

  const [minY, maxY] = getYAxisDomain();

  // 단위 표시
  const getYAxisUnit = () => {
    if (activeMetrics.has('weight') || activeMetrics.has('muscle')) return 'kg';
    if (activeMetrics.has('bodyFat')) return '%';
    return '';
  };

  return (
    <div className="h-full flex flex-col">
      {/* 토글 버튼 - 체지방/근육량 데이터가 있을 때만 표시 */}
      {(hasBodyFatData || hasMuscleData) && (
        <div className="flex gap-2 mb-2 flex-wrap shrink-0">
          <button
            onClick={() => toggleMetric('weight')}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-full transition-all",
              activeMetrics.has('weight')
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            체중
          </button>
          {hasBodyFatData && (
            <button
              onClick={() => toggleMetric('bodyFat')}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-full transition-all",
                activeMetrics.has('bodyFat')
                  ? "bg-warning text-warning-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              체지방
            </button>
          )}
          {hasMuscleData && (
            <button
              onClick={() => toggleMetric('muscle')}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-full transition-all",
                activeMetrics.has('muscle')
                  ? "bg-info text-info-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              근육량
            </button>
          )}
        </div>
      )}

      {/* 차트 */}
      <div className="flex-1" style={{ minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bodyFatGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="muscleGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
            />
            <YAxis
              domain={[minY, maxY]}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
              tickFormatter={(value) => `${value}${getYAxisUnit()}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value: number, name: string) => {
                if (name === 'weight') return [`${value} kg`, '체중'];
                if (name === 'bodyFat') return [`${value} %`, '체지방'];
                if (name === 'muscle') return [`${value} kg`, '근육량'];
                if (name === 'target') return [`${value} kg`, '목표'];
                return [value, name];
              }}
            />
            {targetWeight && activeMetrics.has('weight') && (
              <Area
                type="monotone"
                dataKey="target"
                stroke="hsl(var(--success))"
                strokeDasharray="5 5"
                fill="none"
                strokeWidth={2}
              />
            )}
            {activeMetrics.has('weight') && (
              <Area
                type="monotone"
                dataKey="weight"
                stroke="hsl(var(--primary))"
                fill="url(#weightGradient)"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
              />
            )}
            {activeMetrics.has('bodyFat') && (
              <Area
                type="monotone"
                dataKey="bodyFat"
                stroke="hsl(var(--warning))"
                fill="url(#bodyFatGradient)"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--warning))', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: 'hsl(var(--warning))' }}
                connectNulls
              />
            )}
            {activeMetrics.has('muscle') && (
              <Area
                type="monotone"
                dataKey="muscle"
                stroke="hsl(var(--info))"
                fill="url(#muscleGradient)"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--info))', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: 'hsl(var(--info))' }}
                connectNulls
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
