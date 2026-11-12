import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type {
  ExerciseCategory,
  PlanSetTarget,
  SessionExercise,
  WorkoutPlan,
} from '../types';
import { useAppStore } from '../lib/store';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { BulkSetSheet } from '../components/BulkSetSheet';
import { dateLabel, todayStr } from '../lib/date';
import { ensureNotificationPermission } from '../lib/notifications';
import { uid } from '../lib/id';
import { formatRest } from '../lib/format';

interface DraftSet {
  weight: string;
  reps: string;
  rest: string;
}

interface DraftExercise {
  id: string;
  name: string;
  category?: ExerciseCategory;
  note?: string;
  sets: DraftSet[];
}

function draftFromPlan(plan: WorkoutPlan): DraftExercise[] {
  return plan.exercises.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    category: exercise.category,
    note: exercise.note,
    sets: exercise.sets.map((set) => ({
      weight: set.weightKg === null ? '' : String(set.weightKg),
      reps: String(set.reps),
      rest: String(set.restSeconds),
    })),
  }));
}

function draftFromSession(session: {
  exercises: SessionExercise[];
}): DraftExercise[] {
  return session.exercises.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    category: exercise.category,
    note: exercise.note,
    sets: exercise.sets.map((set) => ({
      weight: set.targetWeightKg === null ? '' : String(set.targetWeightKg),
      reps: String(set.targetReps),
      rest: String(set.restSeconds),
    })),
  }));
}

interface ParsedDraft {
  exercises: Array<{
    id: string;
    name: string;
    category?: ExerciseCategory;
    note?: string;
    targets: PlanSetTarget[];
  }>;
}

function parseDrafts(drafts: DraftExercise[]): { ok: true; data: ParsedDraft } | { ok: false; error: string } {
  const exercises: ParsedDraft['exercises'] = [];
  for (const exercise of drafts) {
    if (!exercise.sets.length) {
      return { ok: false, error: `${exercise.name} 至少需要一组` };
    }
    const targets: PlanSetTarget[] = [];
    for (let index = 0; index < exercise.sets.length; index += 1) {
      const set = exercise.sets[index];
      let weightKg: number | null = null;
      if (set.weight.trim() !== '') {
        const value = Number(set.weight);
        if (!Number.isFinite(value) || value < 0 || value > 999) {
          return { ok: false, error: `${exercise.name} 第${index + 1}组重量不正确` };
        }
        weightKg = Math.round(value * 100) / 100;
      }
      const reps = Number(set.reps);
      if (!Number.isFinite(reps) || reps < 1 || reps > 999) {
        return { ok: false, error: `${exercise.name} 第${index + 1}组次数不正确` };
      }
      const rest = Number(set.rest);
      if (!Number.isFinite(rest) || rest < 0 || rest > 900) {
        return { ok: false, error: `${exercise.name} 第${index + 1}组休息时间不正确` };
      }
      targets.push({ weightKg, reps: Math.round(reps), restSeconds: Math.round(rest) });
    }
    exercises.push({
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      note: exercise.note,
      targets,
    });
  }
  return { ok: true, data: { exercises } };
}

export function ConfirmPlanPage() {
  const navigate = useNavigate();
  const { planId, sessionId, date: routeDate } = useParams();
  const plans = useAppStore((state) => state.plans);
  const sessions = useAppStore((state) => state.sessions);
  const settings = useAppStore((state) => state.settings);
  const createSessionFromPlan = useAppStore((state) => state.createSessionFromPlan);
  const updateSessionTargets = useAppStore((state) => state.updateSessionTargets);
  const startSession = useAppStore((state) => state.startSession);
  const showToast = useAppStore((state) => state.showToast);

  const plan = planId ? plans.find((item) => item.id === planId) : undefined;
  const session = sessionId ? sessions.find((item) => item.id === sessionId) : undefined;
  const date = session?.date ?? routeDate ?? todayStr();
  const canStart = date === todayStr();
  const [draft, setDraft] = useState<DraftExercise[]>(() => {
    if (plan) return draftFromPlan(plan);
    if (session) return draftFromSession(session);
    return [];
  });
  const [starting, setStarting] = useState(false);
  const [bulkIndex, setBulkIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!session) return;
    if (session.status === 'active') {
      navigate(`/session/${session.id}`, { replace: true });
    } else if (session.status === 'completed') {
      navigate(`/day/${session.date}`, { replace: true });
    }
  }, [session, navigate]);

  useEffect(() => {
    if (draft.length || (!plan && !session)) return;
    setDraft(plan ? draftFromPlan(plan) : draftFromSession(session!));
  }, [draft.length, plan, session]);

  const totalSets = useMemo(
    () => draft.reduce((sum, exercise) => sum + exercise.sets.length, 0),
    [draft],
  );

  if (!plan && !session) {
    return (
      <div className="page">
        <PageHeader onBack={() => navigate('/')} title="训练方案不存在" />
        <EmptyState
          icon="alert"
          title="找不到这个训练方案"
          description="它可能已被删除，请回到日历重新选择。"
          action={
            <button className="btn btn--primary" type="button" onClick={() => navigate('/')}>
              返回日历
            </button>
          }
        />
      </div>
    );
  }

  const planName = plan?.name ?? session?.planName ?? '训练';
  const backPath = session ? `/day/${session.date}` : `/pick/${date}`;

  const updateSet = (exerciseIndex: number, setIndex: number, patch: Partial<DraftSet>) => {
    setDraft((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              sets: exercise.sets.map((set, sIndex) =>
                sIndex === setIndex ? { ...set, ...patch } : set,
              ),
            }
          : exercise,
      ),
    );
  };

  const updateExerciseRest = (exerciseIndex: number, value: string) => {
    setDraft((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              sets: exercise.sets.map((set) => ({ ...set, rest: value })),
            }
          : exercise,
      ),
    );
  };

  const addSet = (exerciseIndex: number) => {
    setDraft((current) =>
      current.map((exercise, index) => {
        if (index !== exerciseIndex) return exercise;
        const last = exercise.sets[exercise.sets.length - 1];
        return {
          ...exercise,
          sets: [
            ...exercise.sets,
            {
              weight: last?.weight ?? '',
              reps: last?.reps ?? '10',
              rest: last?.rest ?? String(settings.defaultRestSeconds),
            },
          ],
        };
      }),
    );
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setDraft((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex && exercise.sets.length > 1
          ? { ...exercise, sets: exercise.sets.filter((_, sIndex) => sIndex !== setIndex) }
          : exercise,
      ),
    );
  };

  const startOrSave = async () => {
    if (starting) return;
    const parsed = parseDrafts(draft);
    if (!parsed.ok) {
      showToast(parsed.error);
      return;
    }
    if (canStart) {
      const active = sessions.find(
        (item) => item.date === date && item.status === 'active',
      );
      if (active) {
        showToast('这一天已经有进行中的训练');
        navigate(`/session/${active.id}`, { replace: true });
        return;
      }
    }

    setStarting(true);
    try {
      if (canStart) {
        await ensureNotificationPermission(true).catch(() => false);
      }

      if (session) {
        const parsedExercises: SessionExercise[] = parsed.data.exercises.map(
          (exercise, index) => ({
            id: exercise.id,
            name: exercise.name,
            category: exercise.category,
            order: index,
            note: exercise.note,
            sets: exercise.targets.map((target) => ({
              id: uid('set'),
              targetWeightKg: target.weightKg,
              targetReps: target.reps,
              restSeconds: target.restSeconds,
              status: 'pending' as const,
            })),
          }),
        );
        updateSessionTargets(session.id, parsedExercises);
        if (canStart) {
          startSession(session.id);
          navigate(`/session/${session.id}`, { replace: true });
        } else {
          showToast('训练计划已更新');
          navigate(`/day/${date}`, { replace: true });
        }
        return;
      }

      if (!plan) return;
      const editedPlan: WorkoutPlan = {
        ...plan,
        exercises: parsed.data.exercises.map((exercise) => ({
          id: exercise.id,
          name: exercise.name,
          category: exercise.category,
          note: exercise.note,
          sets: exercise.targets,
        })),
      };
      const created = createSessionFromPlan(
        editedPlan,
        date,
        canStart ? 'active' : 'planned',
      );
      if (canStart) {
        showToast('开始训练，计时已启动');
        navigate(`/session/${created.id}`, { replace: true });
      } else {
        showToast('已安排到日历');
        navigate(`/day/${date}`, { replace: true });
      }
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="page confirm-page">
      <PageHeader
        onBack={() => navigate(backPath)}
        title={canStart ? '确认今天的训练' : '确认训练计划'}
        subtitle={`${dateLabel(date)} · ${planName}`}
      />

      <div className="confirm-summary">
        <div>
          <span className="eyebrow">本次安排</span>
          <h2>{planName}</h2>
        </div>
        <div className="confirm-summary__stats">
          <span>
            <strong>{draft.length}</strong> 动作
          </span>
          <span>
            <strong>{totalSets}</strong> 组
          </span>
        </div>
      </div>

      <div className="notice notice--soft">
        <Icon name="edit" size={16} />
        <p>
          {session
            ? '这里的修改会更新这次已排的训练，不影响计划模板。'
            : '这里的修改只对本次训练生效，不会改设计划模板。'}
        </p>
      </div>

      <div className="confirm-exercises">
        {draft.map((exercise, exerciseIndex) => {
          const rests = new Set(exercise.sets.map((set) => set.rest));
          return (
            <article className="confirm-exercise-card" key={exercise.id}>
              <div className="confirm-exercise__head">
                <span className="order-number">
                  {String(exerciseIndex + 1).padStart(2, '0')}
                </span>
                <div className="confirm-exercise__title">
                  <h3>{exercise.name}</h3>
                  {exercise.category && <span className="tag">{exercise.category}</span>}
                </div>
                <label className="rest-field">
                  <Icon name="timer" size={14} />
                  <input
                    value={exercise.sets[0]?.rest ?? String(settings.defaultRestSeconds)}
                    onChange={(event) => updateExerciseRest(exerciseIndex, event.target.value)}
                    inputMode="numeric"
                    aria-label="组间休息秒数"
                  />
                  <span>s</span>
                </label>
              </div>
              {rests.size > 1 && (
                <p className="form-hint">各组的休息时间原本不同，修改后会统一应用到本动作。</p>
              )}
              <div className="draft-sets">
                {exercise.sets.map((set, setIndex) => (
                  <div className="draft-set-row" key={`${exercise.id}-${setIndex}`}>
                    <span className="draft-set-index">第{setIndex + 1}组</span>
                    <label className="draft-input">
                      <input
                        value={set.weight}
                        onChange={(event) =>
                          updateSet(exerciseIndex, setIndex, { weight: event.target.value })
                        }
                        inputMode="decimal"
                        placeholder="自重"
                        aria-label={`${exercise.name} 第${setIndex + 1}组重量`}
                      />
                      <span>kg</span>
                    </label>
                    <label className="draft-input">
                      <input
                        value={set.reps}
                        onChange={(event) =>
                          updateSet(exerciseIndex, setIndex, { reps: event.target.value })
                        }
                        inputMode="numeric"
                        aria-label={`${exercise.name} 第${setIndex + 1}组次数`}
                      />
                      <span>次</span>
                    </label>
                    <button
                      className="icon-button icon-button--small"
                      type="button"
                      onClick={() => removeSet(exerciseIndex, setIndex)}
                      disabled={exercise.sets.length <= 1}
                      aria-label="删除这一组"
                    >
                      <Icon name="close" size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="confirm-exercise__foot">
                <div className="inline-actions">
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => addSet(exerciseIndex)}
                  >
                    <Icon name="plus" size={14} />
                    加一组
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setBulkIndex(exerciseIndex)}
                  >
                    统一修改
                  </button>
                </div>
                <span className="confirm-exercise__rest-hint">
                  休息 {formatRest(Number(exercise.sets[0]?.rest ?? 0))}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <BulkSetSheet
        open={bulkIndex !== null}
        onClose={() => setBulkIndex(null)}
        exerciseName={bulkIndex !== null ? draft[bulkIndex]?.name ?? '' : ''}
        initial={
          bulkIndex !== null
            ? draft[bulkIndex]?.sets[0] ?? {
                weight: '',
                reps: '10',
                rest: String(settings.defaultRestSeconds),
              }
            : { weight: '', reps: '10', rest: String(settings.defaultRestSeconds) }
        }
        onApply={(values) => {
          if (bulkIndex === null) return;
          setDraft((current) =>
            current.map((exercise, index) =>
              index === bulkIndex
                ? {
                    ...exercise,
                    sets: exercise.sets.map((set) => ({ ...set, ...values })),
                  }
                : exercise,
            ),
          );
        }}
      />

      <div className="bottom-action">
        <button className="btn btn--ghost" type="button" onClick={() => navigate(backPath)}>
          取消
        </button>
        <button
          className="btn btn--primary btn--grow"
          type="button"
          onClick={startOrSave}
          disabled={starting}
        >
          {starting ? '处理中…' : canStart ? '保存并开始训练' : '保存到日历'}
          {!starting && <Icon name="chevronRight" size={18} />}
        </button>
      </div>
    </div>
  );
}
