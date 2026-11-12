import type {
  ExerciseStatus,
  PlanExercise,
  SessionExercise,
  SessionSet,
  SessionStatus,
  SetStatus,
  WorkoutPlan,
  WorkoutSession,
} from '../types';
import { uid } from './id';
import { formatWeight } from './format';

export function planToSessionExercises(plan: WorkoutPlan): SessionExercise[] {
  return plan.exercises.map((exercise, index) => ({
    id: uid('ex'),
    name: exercise.name,
    category: exercise.category,
    order: index,
    note: exercise.note,
    sets: exercise.sets.map((set) => ({
      id: uid('set'),
      targetWeightKg: set.weightKg,
      targetReps: set.reps,
      restSeconds: set.restSeconds,
      status: 'pending',
    })),
  }));
}

export function sessionFromPlan(
  plan: WorkoutPlan,
  date: string,
  status: SessionStatus,
): WorkoutSession {
  const now = Date.now();
  return {
    id: uid('session'),
    date,
    planId: plan.id,
    planName: plan.name,
    status,
    createdAt: now,
    startedAt: status === 'active' ? now : undefined,
    exercises: planToSessionExercises(plan),
  };
}

export function toPlanFromSession(session: WorkoutSession, name: string): WorkoutPlan {
  const now = Date.now();
  return {
    id: uid('plan'),
    name,
    createdAt: now,
    updatedAt: now,
    exercises: session.exercises.map((exercise) => ({
      id: uid('pex'),
      name: exercise.name,
      category: exercise.category,
      note: exercise.note,
      sets: exercise.sets.map((set) => ({
        weightKg: set.actualWeightKg ?? set.targetWeightKg,
        reps: set.actualReps ?? set.targetReps,
        restSeconds: set.restSeconds,
      })),
    })),
  };
}

export function deriveExerciseStatus(exercise: SessionExercise): ExerciseStatus {
  const handled = exercise.sets.filter((set) => set.status !== 'pending').length;
  if (handled === 0) return 'pending';
  if (exercise.sets.every((set) => set.status === 'skipped')) return 'skipped';
  if (handled < exercise.sets.length) return 'inProgress';
  return 'completed';
}

export function handledSetCount(exercise: SessionExercise): number {
  return exercise.sets.filter((set) => set.status !== 'pending').length;
}

export function effectiveWeight(set: SessionSet): number | null {
  if (set.status === 'done' || set.status === 'partial') {
    return set.actualWeightKg === undefined ? set.targetWeightKg : set.actualWeightKg;
  }
  return set.targetWeightKg;
}

export function effectiveReps(set: SessionSet): number {
  if (set.status === 'done' || set.status === 'partial') {
    return set.actualReps ?? set.targetReps;
  }
  return set.targetReps;
}

export interface ExerciseSummary {
  weightLabel: string;
  repsLabel: string;
  mixedWeight: boolean;
  segments: Array<{
    weightLabel: string;
    repsLabel: string;
    partial: boolean;
    skipped: boolean;
  }>;
}

export function exerciseSummary(exercise: SessionExercise): ExerciseSummary {
  const segments = exercise.sets.map((set) => {
    const weight = effectiveWeight(set);
    const reps = effectiveReps(set);
    return {
      weightLabel: formatWeight(weight),
      repsLabel:
        set.status === 'skipped'
          ? '—'
          : `${reps}${set.status === 'partial' ? '*' : ''}`,
      partial: set.status === 'partial',
      skipped: set.status === 'skipped',
    };
  });

  const weightLabels = [...new Set(segments.map((item) => item.weightLabel))];
  if (weightLabels.length === 1) {
    return {
      weightLabel: weightLabels[0],
      repsLabel: segments.map((item) => item.repsLabel).join('/'),
      mixedWeight: false,
      segments,
    };
  }

  return {
    weightLabel: '重量不一',
    repsLabel: segments.map((item) => `${item.weightLabel}×${item.repsLabel}`).join(' / '),
    mixedWeight: true,
    segments,
  };
}

export function exerciseTargetSummary(exercise: SessionExercise): string {
  const weights = [...new Set(exercise.sets.map((set) => formatWeight(set.targetWeightKg)))];
  const reps = [...new Set(exercise.sets.map((set) => set.targetReps))];
  const weightLabel = weights.length === 1 ? weights[0] : weights.join('/');
  const repsLabel = reps.length === 1 ? `${reps[0]}次` : `${reps.join('/')}次`;
  return `${exercise.sets.length}组 · ${weightLabel} × ${repsLabel}`;
}

export function nextActionLabel(
  session: WorkoutSession,
  exerciseId: string,
  setId: string,
): string {
  const exercise = session.exercises.find((item) => item.id === exerciseId);
  if (!exercise) return '该做下一组了';
  const setIndex = exercise.sets.findIndex((item) => item.id === setId);
  const nextSet = exercise.sets
    .slice(setIndex + 1)
    .find((item) => item.status === 'pending');
  if (nextSet) {
    const index = exercise.sets.findIndex((item) => item.id === nextSet.id);
    return `${exercise.name} 第${index + 1}组 · ${formatWeight(nextSet.targetWeightKg)} × ${nextSet.targetReps}次`;
  }
  const ordered = [...session.exercises].sort((a, b) => a.order - b.order);
  const currentOrder = exercise.order;
  const after = ordered.find(
    (item) => item.order > currentOrder && item.sets.some((set) => set.status === 'pending'),
  );
  const anyOther = ordered.find(
    (item) =>
      item.id !== exercise.id && item.sets.some((set) => set.status === 'pending'),
  );
  const nextExercise = after ?? anyOther;
  if (nextExercise) return `下一动作：${nextExercise.name}`;
  return '所有动作已完成，记得结束训练';
}

export interface SessionStats {
  totalSets: number;
  handledSets: number;
  doneSets: number;
  partialSets: number;
  skippedSets: number;
  pendingSets: number;
  totalExercises: number;
  completedExercises: number;
  skippedExercises: number;
  totalVolume: number;
  totalReps: number;
  durationMs: number;
}

export function sessionStats(session: WorkoutSession): SessionStats {
  const sets = session.exercises.flatMap((exercise) => exercise.sets);
  let totalVolume = 0;
  let totalReps = 0;
  for (const set of sets) {
    if (set.status === 'done' || set.status === 'partial') {
      totalReps += set.actualReps ?? set.targetReps;
      totalVolume += (set.actualWeightKg ?? 0) * (set.actualReps ?? set.targetReps);
    }
  }
  return {
    totalSets: sets.length,
    handledSets: sets.filter((set) => set.status !== 'pending').length,
    doneSets: sets.filter((set) => set.status === 'done').length,
    partialSets: sets.filter((set) => set.status === 'partial').length,
    skippedSets: sets.filter((set) => set.status === 'skipped').length,
    pendingSets: sets.filter((set) => set.status === 'pending').length,
    totalExercises: session.exercises.length,
    completedExercises: session.exercises.filter(
      (exercise) => deriveExerciseStatus(exercise) === 'completed',
    ).length,
    skippedExercises: session.exercises.filter(
      (exercise) => deriveExerciseStatus(exercise) === 'skipped',
    ).length,
    totalVolume,
    totalReps,
    durationMs:
      session.startedAt && session.endedAt ? session.endedAt - session.startedAt : 0,
  };
}

export function setStatusLabel(status: SetStatus): string {
  switch (status) {
    case 'done':
      return '完成';
    case 'partial':
      return '未完成';
    case 'skipped':
      return '跳过';
    default:
      return '未记录';
  }
}

export function exerciseStatusLabel(status: ExerciseStatus): string {
  switch (status) {
    case 'completed':
      return '已完成';
    case 'inProgress':
      return '进行中';
    case 'skipped':
      return '已跳过';
    default:
      return '未开始';
  }
}

export function cloneExercises(exercises: SessionExercise[]): SessionExercise[] {
  return exercises.map((exercise) => ({
    ...exercise,
    sets: exercise.sets.map((set) => ({ ...set })),
  }));
}

export function planExerciseFromDef(
  name: string,
  category: PlanExercise['category'],
  setCount: number,
  weightKg: number | null,
  reps: number,
  restSeconds: number,
): PlanExercise {
  return {
    id: uid('pex'),
    name,
    category,
    sets: Array.from({ length: setCount }, () => ({
      weightKg,
      reps,
      restSeconds,
    })),
  };
}
