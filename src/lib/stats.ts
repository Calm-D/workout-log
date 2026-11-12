import type { BodyMetric, WorkoutPlan, WorkoutSession } from '../types';
import { sessionStats } from './plan';

export type TrendMetric = 'maxWeight' | 'volume' | 'reps';

export interface TrendPoint {
  date: string;
  value: number;
}

export function exerciseTrend(
  sessions: WorkoutSession[],
  exerciseName: string,
  metric: TrendMetric,
): TrendPoint[] {
  const byDate = new Map<string, number>();
  const completed = sessions
    .filter((session) => session.status === 'completed')
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const session of completed) {
    for (const exercise of session.exercises) {
      if (exercise.name !== exerciseName) continue;
      for (const set of exercise.sets) {
        if (set.status !== 'done' && set.status !== 'partial') continue;
        const weight = set.actualWeightKg === undefined ? set.targetWeightKg : set.actualWeightKg;
        const reps = set.actualReps ?? set.targetReps;
        let value: number | null = null;
        if (metric === 'maxWeight') {
          value = weight === null ? null : weight;
        } else if (metric === 'volume') {
          value = (weight ?? 0) * reps;
        } else {
          value = reps;
        }
        if (value === null) continue;
        const previous = byDate.get(session.date);
        if (metric === 'maxWeight') {
          byDate.set(session.date, previous === undefined ? value : Math.max(previous, value));
        } else {
          byDate.set(session.date, (previous ?? 0) + value);
        }
      }
    }
  }

  return [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function exerciseNamesFromPlans(plans: WorkoutPlan[]): string[] {
  const names = new Set<string>();
  for (const plan of plans) {
    if (plan.sample) continue;
    for (const exercise of plan.exercises) {
      names.add(exercise.name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'zh-CN'));
}

export function bodyMetricTrend(
  metrics: BodyMetric[],
  key: keyof Pick<BodyMetric, 'weightKg' | 'waistCm' | 'chestCm' | 'armCm' | 'thighCm'>,
): TrendPoint[] {
  const byDate = new Map<string, { value: number; createdAt: number }>();
  for (const metric of metrics) {
    const value = metric[key];
    if (typeof value !== 'number' || Number.isNaN(value)) continue;
    const existing = byDate.get(metric.date);
    if (!existing || existing.createdAt <= metric.createdAt) {
      byDate.set(metric.date, { value, createdAt: metric.createdAt });
    }
  }
  return [...byDate.entries()]
    .map(([date, item]) => ({ date, value: item.value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function latestTrendDelta(points: TrendPoint[]): number | null {
  if (points.length < 2) return null;
  return points[points.length - 1].value - points[points.length - 2].value;
}

export function bestTrendValue(points: TrendPoint[]): number | null {
  if (!points.length) return null;
  return Math.max(...points.map((point) => point.value));
}

export function totalCompletedSessions(sessions: WorkoutSession[]): number {
  return sessions.filter((session) => session.status === 'completed').length;
}

export function totalVolume(sessions: WorkoutSession[]): number {
  return sessions.reduce((sum, session) => sum + sessionStats(session).totalVolume, 0);
}

export function currentStreakWeeks(sessions: WorkoutSession[]): number {
  const dates = new Set(
    sessions.filter((session) => session.status === 'completed').map((session) => session.date),
  );
  if (!dates.size) return 0;
  let streak = 0;
  const cursor = new Date();
  const day = cursor.getDay();
  const mondayOffset = (day + 6) % 7;
  cursor.setDate(cursor.getDate() - mondayOffset);
  for (;;) {
    let has = false;
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(cursor);
      d.setDate(cursor.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`;
      if (dates.has(key)) {
        has = true;
        break;
      }
    }
    if (!has) {
      if (streak === 0) {
        cursor.setDate(cursor.getDate() - 7);
        continue;
      }
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
    if (streak > 520) break;
  }
  return streak;
}
