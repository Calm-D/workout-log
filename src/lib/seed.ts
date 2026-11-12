import dayjs from 'dayjs';
import type {
  BodyMetric,
  PlanExercise,
  WorkoutPlan,
  WorkoutSession,
} from '../types';
import { daysAgo } from './date';
import { sessionFromPlan } from './plan';

interface SeedExercise {
  name: string;
  category: PlanExercise['category'];
  sets: number;
  weight: number | null;
  reps: number;
  rest: number;
}

function makePlan(id: string, name: string, exercises: SeedExercise[]): WorkoutPlan {
  const now = Date.now();
  return {
    id,
    name,
    createdAt: now - 1000 * 60 * 60 * 24 * 30,
    updatedAt: now - 1000 * 60 * 60 * 24 * 2,
    lastUsedAt: now - 1000 * 60 * 60 * 24 * 3,
    sample: true,
    exercises: exercises.map((exercise, index) => ({
      id: `${id}-ex-${index}`,
      name: exercise.name,
      category: exercise.category,
      sets: Array.from({ length: exercise.sets }, () => ({
        weightKg: exercise.weight,
        reps: exercise.reps,
        restSeconds: exercise.rest,
      })),
    })),
  };
}

function completeSession(
  session: WorkoutSession,
  startedAt: string,
  durationMinutes: number,
  options?: {
    exerciseIndex?: number;
    setIndex?: number;
    actualReps?: number;
    note?: string;
    sessionNote?: string;
  },
): WorkoutSession {
  const start = dayjs(startedAt).hour(19).minute(10).second(0);
  const end = start.add(durationMinutes, 'minute');
  const sets = session.exercises.flatMap((exercise) => exercise.sets);
  let cursor = start.valueOf();
  sets.forEach((set, index) => {
    cursor += 1000 * 60 * 2;
    set.status = 'done';
    set.actualWeightKg = set.targetWeightKg;
    set.actualReps = set.targetReps;
    set.completedAt = cursor;
    if (
      options?.exerciseIndex !== undefined &&
      options.setIndex !== undefined &&
      index === sets.findIndex((item) => {
        const exercise = session.exercises[options.exerciseIndex!];
        return exercise.sets[options.setIndex!]?.id === item.id;
      })
    ) {
      set.status = 'partial';
      set.actualReps = options.actualReps ?? Math.max(1, set.targetReps - 2);
      set.note = options.note;
    }
  });
  return {
    ...session,
    startedAt: start.valueOf(),
    endedAt: end.valueOf(),
    note: options?.sessionNote,
  };
}

export function createSampleData(): {
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
  bodyMetrics: BodyMetric[];
  customExercises: [];
} {
  const pull = makePlan('sample-plan-pull', '拉A', [
    { name: '引体向上', category: '背', sets: 5, weight: null, reps: 5, rest: 120 },
    { name: '杠铃划船', category: '背', sets: 3, weight: 40, reps: 10, rest: 90 },
    { name: '面拉', category: '肩', sets: 3, weight: 45, reps: 12, rest: 60 },
    { name: '哑铃弯举', category: '手臂', sets: 3, weight: 12, reps: 12, rest: 60 },
  ]);
  const legs = makePlan('sample-plan-legs', '腿A', [
    { name: '深蹲', category: '腿', sets: 4, weight: 80, reps: 8, rest: 180 },
    { name: '腿举', category: '腿', sets: 3, weight: 120, reps: 12, rest: 90 },
    { name: '腿弯举', category: '腿', sets: 3, weight: 40, reps: 12, rest: 60 },
    { name: '提踵', category: '腿', sets: 4, weight: 60, reps: 15, rest: 60 },
  ]);
  const push = makePlan('sample-plan-push', '推A', [
    { name: '卧推', category: '胸', sets: 4, weight: 60, reps: 8, rest: 120 },
    { name: '上斜哑铃卧推', category: '胸', sets: 3, weight: 20, reps: 10, rest: 90 },
    { name: '绳索夹胸', category: '胸', sets: 3, weight: 15, reps: 12, rest: 60 },
    { name: '绳索下压', category: '手臂', sets: 3, weight: 20, reps: 12, rest: 60 },
  ]);

  const pullDate = daysAgo(3);
  const legDate = daysAgo(5);
  const pushDate = daysAgo(7);
  const pullOldDate = daysAgo(10);
  const legOldDate = daysAgo(8);
  const pushOldDate = daysAgo(14);
  pull.lastUsedAt = dayjs(pullDate).hour(19).valueOf();
  legs.lastUsedAt = dayjs(legDate).hour(19).valueOf();
  push.lastUsedAt = dayjs(pushDate).hour(19).valueOf();

  const pullSession = completeSession(
    { ...sessionFromPlan(pull, pullDate, 'completed'), id: 'sample-session-pull' },
    pullDate,
    52,
    {
      exerciseIndex: 0,
      setIndex: 4,
      actualReps: 4,
      note: '最后一组力竭，下次考虑保留一点余力。',
      sessionNote: '整体状态不错，划船比上次稳。',
    },
  );
  const legSession = completeSession(
    { ...sessionFromPlan(legs, legDate, 'completed'), id: 'sample-session-legs' },
    legDate,
    64,
    { sessionNote: '深蹲最后一组有点吃力，但完成了。' },
  );
  const pushSession = completeSession(
    { ...sessionFromPlan(push, pushDate, 'completed'), id: 'sample-session-push' },
    pushDate,
    48,
    {
      exerciseIndex: 0,
      setIndex: 3,
      actualReps: 6,
      note: '肩膀有点紧，最后一组只做了 6 个。',
    },
  );

  const pullOldSession = completeSession(
    { ...sessionFromPlan(pull, pullOldDate, 'completed'), id: 'sample-session-pull-old' },
    pullOldDate,
    50,
  );
  pullOldSession.exercises[1].sets = pullOldSession.exercises[1].sets.map((set) => ({
    ...set,
    actualWeightKg: 37.5,
    targetWeightKg: 37.5,
  }));
  pullOldSession.exercises[2].sets = pullOldSession.exercises[2].sets.map((set) => ({
    ...set,
    actualWeightKg: 40,
    targetWeightKg: 40,
  }));

  const legOldSession = completeSession(
    { ...sessionFromPlan(legs, legOldDate, 'completed'), id: 'sample-session-legs-old' },
    legOldDate,
    58,
  );
  legOldSession.exercises[0].sets = legOldSession.exercises[0].sets.map((set) => ({
    ...set,
    actualWeightKg: 75,
    targetWeightKg: 75,
  }));
  legOldSession.exercises[1].sets = legOldSession.exercises[1].sets.map((set) => ({
    ...set,
    actualWeightKg: 110,
    targetWeightKg: 110,
  }));

  const pushOldSession = completeSession(
    { ...sessionFromPlan(push, pushOldDate, 'completed'), id: 'sample-session-push-old' },
    pushOldDate,
    46,
  );
  pushOldSession.exercises[0].sets = pushOldSession.exercises[0].sets.map((set) => ({
    ...set,
    actualWeightKg: 57.5,
    targetWeightKg: 57.5,
  }));

  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const planned = {
    ...sessionFromPlan(push, tomorrow, 'planned'),
    id: 'sample-session-planned',
    planName: '推A',
  };

  const bodyBase = 78.4;
  const bodyMetrics: BodyMetric[] = [
    {
      id: 'sample-body-1',
      date: daysAgo(21),
      weightKg: bodyBase,
      waistCm: 85.2,
      chestCm: 100,
      armCm: 36.5,
      thighCm: 58.5,
      createdAt: dayjs(daysAgo(21)).hour(7).valueOf(),
    },
    {
      id: 'sample-body-2',
      date: daysAgo(14),
      weightKg: 78.1,
      waistCm: 84.8,
      createdAt: dayjs(daysAgo(14)).hour(7).valueOf(),
    },
    {
      id: 'sample-body-3',
      date: daysAgo(7),
      weightKg: 77.9,
      waistCm: 84.4,
      createdAt: dayjs(daysAgo(7)).hour(7).valueOf(),
    },
    {
      id: 'sample-body-4',
      date: daysAgo(1),
      weightKg: 77.6,
      waistCm: 84,
      createdAt: dayjs(daysAgo(1)).hour(7).valueOf(),
    },
  ];

  return {
    plans: [pull, legs, push],
    sessions: [
      pullSession,
      legSession,
      pushSession,
      pullOldSession,
      legOldSession,
      pushOldSession,
      planned,
    ],
    bodyMetrics,
    customExercises: [],
  };
}
