import { describe, expect, it } from 'vitest';
import type {
  BodyMetric,
  SessionExercise,
  WorkoutPlan,
  WorkoutSession,
} from '../types';
import {
  deriveExerciseStatus,
  exerciseSummary,
  sessionFromPlan,
  sessionStats,
} from '../lib/plan';
import {
  bodyMetricTrend,
  exerciseNamesFromPlans,
  exerciseTrend,
} from '../lib/stats';
import {
  buildExportBundle,
  mergeImportedData,
  parseImportBundle,
} from '../lib/exportImport';
import { monthMatrix } from '../lib/date';

function makePlan(): WorkoutPlan {
  return {
    id: 'plan-1',
    name: '拉A',
    createdAt: 1,
    updatedAt: 1,
    exercises: [
      {
        id: 'ex-1',
        name: '引体向上',
        category: '背',
        sets: [
          { weightKg: null, reps: 5, restSeconds: 120 },
          { weightKg: null, reps: 5, restSeconds: 120 },
        ],
      },
      {
        id: 'ex-2',
        name: '杠铃划船',
        category: '背',
        sets: [
          { weightKg: 40, reps: 10, restSeconds: 90 },
          { weightKg: 40, reps: 10, restSeconds: 90 },
          { weightKg: 40, reps: 10, restSeconds: 90 },
        ],
      },
    ],
  };
}

function makeSession(): WorkoutSession {
  const session = sessionFromPlan(makePlan(), '2026-11-12', 'completed');
  session.startedAt = 1000;
  session.endedAt = 1000 + 60 * 60 * 1000;
  const pull = session.exercises[0];
  pull.sets[0] = {
    ...pull.sets[0],
    status: 'done',
    actualWeightKg: null,
    actualReps: 5,
    completedAt: 2000,
  };
  pull.sets[1] = {
    ...pull.sets[1],
    status: 'partial',
    actualWeightKg: null,
    actualReps: 3,
    note: '最后一组没力了',
    completedAt: 3000,
  };
  const row = session.exercises[1];
  row.sets = row.sets.map((set, index) => ({
    ...set,
    status: 'done',
    actualWeightKg: index === 2 ? 42.5 : 40,
    actualReps: 10,
    completedAt: 4000,
  }));
  return session;
}

describe('session snapshot and summaries', () => {
  it('creates a deep snapshot from a plan', () => {
    const plan = makePlan();
    const session = sessionFromPlan(plan, '2026-11-12', 'planned');
    expect(session.exercises).toHaveLength(2);
    expect(session.exercises[0].sets).toHaveLength(2);
    session.exercises[0].sets[0].targetReps = 8;
    expect(plan.exercises[0].sets[0].reps).toBe(5);
    expect(session.status).toBe('planned');
  });

  it('formats bodyweight reps with incomplete marks', () => {
    const session = makeSession();
    const summary = exerciseSummary(session.exercises[0]);
    expect(summary.mixedWeight).toBe(false);
    expect(summary.weightLabel).toBe('自重');
    expect(summary.repsLabel).toBe('5/3*');
  });

  it('formats mixed weights per set', () => {
    const session = makeSession();
    const summary = exerciseSummary(session.exercises[1]);
    expect(summary.mixedWeight).toBe(true);
    expect(summary.segments).toHaveLength(3);
    expect(summary.segments[2].weightLabel).toBe('42.5kg');
    expect(summary.repsLabel).toContain('42.5kg×10');
  });

  it('derives exercise states', () => {
    const session = makeSession();
    const exercise = session.exercises[0];
    expect(deriveExerciseStatus({ ...exercise, sets: exercise.sets.map((s) => ({ ...s, status: 'pending' })) })).toBe('pending');
    expect(deriveExerciseStatus(exercise)).toBe('completed');
    const inProgress: SessionExercise = {
      ...exercise,
      sets: [
        { ...exercise.sets[0], status: 'done' },
        { ...exercise.sets[1], status: 'pending' },
      ],
    };
    expect(deriveExerciseStatus(inProgress)).toBe('inProgress');
    const skipped: SessionExercise = {
      ...exercise,
      sets: exercise.sets.map((set) => ({ ...set, status: 'skipped' })),
    };
    expect(deriveExerciseStatus(skipped)).toBe('skipped');
  });

  it('calculates volume, reps and duration', () => {
    const session = makeSession();
    const stats = sessionStats(session);
    expect(stats.totalSets).toBe(5);
    expect(stats.doneSets).toBe(4);
    expect(stats.partialSets).toBe(1);
    expect(stats.totalVolume).toBe(40 * 10 * 2 + 42.5 * 10);
    expect(stats.totalReps).toBe(5 + 3 + 10 + 10 + 10);
    expect(stats.durationMs).toBe(60 * 60 * 1000);
  });
});

describe('trend aggregation', () => {
  it('groups exercise points by date', () => {
    const sessionA = makeSession();
    sessionA.id = 's1';
    sessionA.date = '2026-11-01';
    const sessionB = makeSession();
    sessionB.id = 's2';
    sessionB.date = '2026-11-05';
    sessionB.exercises[1].sets = sessionB.exercises[1].sets.map((set) => ({
      ...set,
      actualWeightKg: 45,
      actualReps: 10,
    }));
    const points = exerciseTrend([sessionB, sessionA], '杠铃划船', 'volume');
    expect(points.map((point) => point.date)).toEqual(['2026-11-01', '2026-11-05']);
    expect(points[0].value).toBe(40 * 10 * 2 + 42.5 * 10);
    expect(points[1].value).toBe(45 * 10 * 3);
  });

  it('aggregates body metrics by date', () => {
    const metrics: BodyMetric[] = [
      { id: 'b1', date: '2026-11-01', weightKg: 80, createdAt: 1 },
      { id: 'b2', date: '2026-11-02', weightKg: 79.5, createdAt: 2 },
      { id: 'b3', date: '2026-11-01', weightKg: 80.2, createdAt: 3 },
    ];
    const points = bodyMetricTrend(metrics, 'weightKg');
    expect(points).toHaveLength(2);
    expect(points[0].value).toBe(80.2);
  });

  it('lists only exercises from user plans and excludes samples', () => {
    const plan = makePlan();
    const samplePlan: WorkoutPlan = {
      ...plan,
      id: 'sample-plan',
      sample: true,
      exercises: [
        {
          id: 'sample-ex',
          name: '深蹲',
          category: '腿',
          sets: [{ weightKg: 60, reps: 8, restSeconds: 120 }],
        },
      ],
    };
    const names = exerciseNamesFromPlans([plan, plan, samplePlan]);
    expect(names).toHaveLength(2);
    expect(names).toContain('引体向上');
    expect(names).toContain('杠铃划船');
    expect(names).not.toContain('深蹲');
  });
});

describe('backup import and export', () => {
  it('round-trips and merges bundles', () => {
    const session = makeSession();
    const bundle = buildExportBundle({
      plans: [makePlan()],
      sessions: [session],
      bodyMetrics: [],
      customExercises: [],
    });
    const parsed = parseImportBundle(JSON.stringify(bundle));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const merged = mergeImportedData(
      {
        plans: [],
        sessions: [session],
        bodyMetrics: [],
        customExercises: [],
      },
      parsed.data,
    );
    expect(merged.plans).toHaveLength(1);
    expect(merged.sessions).toHaveLength(1);
  });

  it('rejects malformed JSON and unknown versions', () => {
    expect(parseImportBundle('not-json').ok).toBe(false);
    const invalid = parseImportBundle(
      JSON.stringify({ version: 99, plans: [], sessions: [], bodyMetrics: [] }),
    );
    expect(invalid.ok).toBe(false);
  });
});

describe('calendar grid', () => {
  it('builds a monday-first 6 week grid', () => {
    const cells = monthMatrix(2026, 10);
    expect(cells).toHaveLength(42);
    expect(cells[0].date).toBe('2026-10-26');
    expect(cells[6].date).toBe('2026-11-01');
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(30);
  });
});
