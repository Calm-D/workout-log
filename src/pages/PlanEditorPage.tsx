import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import type { ExerciseCategory, PlanSetTarget, WorkoutPlan } from '../types';
import { useAppStore } from '../lib/store';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ExercisePickerSheet } from '../components/ExercisePickerSheet';
import { BulkSetSheet } from '../components/BulkSetSheet';
import { uid } from '../lib/id';
import { dateLabel } from '../lib/date';

interface DraftSet {
  weight: string;
  reps: string;
  rest: string;
}

interface DraftExercise {
  id: string;
  name: string;
  category?: ExerciseCategory;
  sets: DraftSet[];
}

function draftFromPlan(plan: WorkoutPlan): DraftExercise[] {
  return plan.exercises.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    category: exercise.category,
    sets: exercise.sets.map((set) => ({
      weight: set.weightKg === null ? '' : String(set.weightKg),
      reps: String(set.reps),
      rest: String(set.restSeconds),
    })),
  }));
}

function parseSets(sets: DraftSet[], exerciseName: string): PlanSetTarget[] | string {
  const targets: PlanSetTarget[] = [];
  for (let index = 0; index < sets.length; index += 1) {
    const set = sets[index];
    let weightKg: number | null = null;
    if (set.weight.trim() !== '') {
      const value = Number(set.weight);
      if (!Number.isFinite(value) || value < 0 || value > 999) {
        return `${exerciseName} 第${index + 1}组重量不正确`;
      }
      weightKg = Math.round(value * 100) / 100;
    }
    const reps = Number(set.reps);
    if (!Number.isFinite(reps) || reps < 1 || reps > 999) {
      return `${exerciseName} 第${index + 1}组次数不正确`;
    }
    const rest = Number(set.rest);
    if (!Number.isFinite(rest) || rest < 0 || rest > 900) {
      return `${exerciseName} 第${index + 1}组休息时间不正确`;
    }
    targets.push({ weightKg, reps: Math.round(reps), restSeconds: Math.round(rest) });
  }
  return targets;
}

export function PlanEditorPage() {
  const navigate = useNavigate();
  const { planId } = useParams();
  const [searchParams] = useSearchParams();
  const allPlans = useAppStore((state) => state.plans);
  const plan = planId ? allPlans.find((item) => item.id === planId) : undefined;
  const settings = useAppStore((state) => state.settings);
  const savePlan = useAppStore((state) => state.savePlan);
  const deletePlan = useAppStore((state) => state.deletePlan);
  const showToast = useAppStore((state) => state.showToast);
  const scheduleDate = searchParams.get('date') ?? '';

  const [name, setName] = useState(plan?.name ?? '');
  const [note, setNote] = useState(plan?.note ?? '');
  const [exercises, setExercises] = useState<DraftExercise[]>(() =>
    plan ? draftFromPlan(plan) : [],
  );
  const [dirty, setDirty] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [deleteExerciseIndex, setDeleteExerciseIndex] = useState<number | null>(null);
  const [deletePlanOpen, setDeletePlanOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [bulkIndex, setBulkIndex] = useState<number | null>(null);

  const totalSets = useMemo(
    () => exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0),
    [exercises],
  );

  const fallbackPath = scheduleDate ? `/pick/${scheduleDate}` : '/plans';

  if (planId && !plan) {
    return (
      <div className="page">
        <PageHeader onBack={() => navigate('/plans')} title="计划不存在" />
        <EmptyState
          icon="alert"
          title="找不到这个计划"
          description="它可能已经被删除。"
          action={
            <button className="btn btn--primary" type="button" onClick={() => navigate('/plans')}>
              返回计划库
            </button>
          }
        />
      </div>
    );
  }

  const markDirty = () => setDirty(true);

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof DraftSet,
    value: string,
  ) => {
    setExercises((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex
          ? {
              ...exercise,
              sets: exercise.sets.map((set, sIndex) =>
                sIndex === setIndex ? { ...set, [field]: value } : set,
              ),
            }
          : exercise,
      ),
    );
    markDirty();
  };

  const addSet = (exerciseIndex: number) => {
    setExercises((current) =>
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
    markDirty();
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setExercises((current) =>
      current.map((exercise, index) =>
        index === exerciseIndex && exercise.sets.length > 1
          ? { ...exercise, sets: exercise.sets.filter((_, sIndex) => sIndex !== setIndex) }
          : exercise,
      ),
    );
    markDirty();
  };

  const moveExercise = (index: number, delta: number) => {
    setExercises((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    markDirty();
  };

  const removeExercise = (index: number) => {
    setExercises((current) => current.filter((_, itemIndex) => itemIndex !== index));
    if (bulkIndex === index) setBulkIndex(null);
    markDirty();
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('请填写计划名称');
      return;
    }
    if (!exercises.length) {
      showToast('至少添加一个动作');
      return;
    }
    const parsedExercises: Array<{
      id: string;
      name: string;
      category?: ExerciseCategory;
      sets: PlanSetTarget[];
    }> = [];
    for (const exercise of exercises) {
      const parsed = parseSets(exercise.sets, exercise.name);
      if (typeof parsed === 'string') {
        showToast(parsed);
        return;
      }
      parsedExercises.push({
        id: exercise.id,
        name: exercise.name,
        category: exercise.category,
        sets: parsed,
      });
    }
    const now = Date.now();
    const saved: WorkoutPlan = {
      id: plan?.id ?? uid('plan'),
      name: trimmedName,
      note: note.trim() || undefined,
      exercises: parsedExercises,
      createdAt: plan?.createdAt ?? now,
      updatedAt: now,
      lastUsedAt: plan?.lastUsedAt,
    };
    savePlan(saved);
    showToast('计划已保存');
    if (scheduleDate) {
      navigate(`/confirm/plan/${saved.id}/${scheduleDate}`, { replace: true });
    } else {
      navigate('/plans', { replace: true });
    }
  };

  const handleBack = () => {
    if (dirty) {
      setLeaveOpen(true);
      return;
    }
    navigate(fallbackPath);
  };

  return (
    <div className="page plan-editor-page">
      <PageHeader
        onBack={handleBack}
        title={planId ? '编辑计划' : '新建计划'}
        subtitle={
          scheduleDate
            ? `保存后安排到 ${dateLabel(scheduleDate)}`
            : '设置动作、重量、次数和组间休息'
        }
        actions={
          planId ? (
            <button
              className="icon-button"
              type="button"
              onClick={() => setDeletePlanOpen(true)}
              aria-label="删除计划"
            >
              <Icon name="trash" size={19} />
            </button>
          ) : null
        }
      />

      <div className="editor-summary">
        <label className="field">
          <span>计划名称</span>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              markDirty();
            }}
            placeholder="例如：拉A、推A、腿A"
            maxLength={20}
            autoFocus={!planId}
          />
        </label>
        <label className="field">
          <span>备注</span>
          <textarea
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              markDirty();
            }}
            rows={2}
            placeholder="可选，例如：下次卧推加重 2.5kg"
          />
        </label>
        <div className="editor-summary__meta">
          <span>{exercises.length} 个动作</span>
          <span>{totalSets} 组</span>
        </div>
      </div>

      <div className="section-heading">
        <h2>动作安排</h2>
        <span>按顺序排列</span>
      </div>

      <div className="editor-exercises">
        {exercises.map((exercise, exerciseIndex) => (
          <article className="editor-exercise-card" key={exercise.id}>
            <div className="editor-exercise__head">
              <span className="order-number">
                {String(exerciseIndex + 1).padStart(2, '0')}
              </span>
              <div className="editor-exercise__title">
                <h3>{exercise.name}</h3>
                {exercise.category && <span className="tag">{exercise.category}</span>}
              </div>
              <div className="editor-exercise__actions">
                <button
                  className="icon-button icon-button--small"
                  type="button"
                  onClick={() => moveExercise(exerciseIndex, -1)}
                  disabled={exerciseIndex === 0}
                  aria-label="上移"
                >
                  <Icon name="chevronUp" size={17} />
                </button>
                <button
                  className="icon-button icon-button--small"
                  type="button"
                  onClick={() => moveExercise(exerciseIndex, 1)}
                  disabled={exerciseIndex === exercises.length - 1}
                  aria-label="下移"
                >
                  <Icon name="chevronDown" size={17} />
                </button>
                <button
                  className="icon-button icon-button--small"
                  type="button"
                  onClick={() => setDeleteExerciseIndex(exerciseIndex)}
                  aria-label="删除动作"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </div>

            <div className="editor-set-head">
              <span>组</span>
              <span>重量</span>
              <span>次数</span>
              <span>休息</span>
              <span />
            </div>
            <div className="editor-sets">
              {exercise.sets.map((set, setIndex) => (
                <div className="editor-set-row" key={`${exercise.id}-${setIndex}`}>
                  <span className="editor-set-index">{setIndex + 1}</span>
                  <label className="mini-input">
                    <input
                      value={set.weight}
                      onChange={(event) =>
                        updateSet(exerciseIndex, setIndex, 'weight', event.target.value)
                      }
                      inputMode="decimal"
                      placeholder="自重"
                      aria-label={`${exercise.name} 第${setIndex + 1}组重量`}
                    />
                    <span>kg</span>
                  </label>
                  <label className="mini-input">
                    <input
                      value={set.reps}
                      onChange={(event) =>
                        updateSet(exerciseIndex, setIndex, 'reps', event.target.value)
                      }
                      inputMode="numeric"
                      aria-label={`${exercise.name} 第${setIndex + 1}组次数`}
                    />
                    <span>次</span>
                  </label>
                  <label className="mini-input">
                    <input
                      value={set.rest}
                      onChange={(event) =>
                        updateSet(exerciseIndex, setIndex, 'rest', event.target.value)
                      }
                      inputMode="numeric"
                      aria-label={`${exercise.name} 第${setIndex + 1}组休息`}
                    />
                    <span>s</span>
                  </label>
                  <button
                    className="icon-button icon-button--small"
                    type="button"
                    onClick={() => removeSet(exerciseIndex, setIndex)}
                    disabled={exercise.sets.length <= 1}
                    aria-label="删除这一组"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="editor-exercise__foot">
              <button
                className="text-button"
                type="button"
                onClick={() => setBulkIndex(exerciseIndex)}
              >
                统一设置
              </button>
              <button
                className="text-button"
                type="button"
                onClick={() => addSet(exerciseIndex)}
              >
                <Icon name="plus" size={14} />
                加一组
              </button>
            </div>
          </article>
        ))}

        {!exercises.length && (
          <div className="editor-empty">
            <p>还没有动作。添加第一个动作，设定目标和休息。</p>
          </div>
        )}
      </div>

      <button
        className="btn btn--soft btn--full add-exercise-button"
        type="button"
        onClick={() => setPickerOpen(true)}
      >
        <Icon name="plus" size={17} />
        添加动作
      </button>

      <div className="bottom-action">
        <button className="btn btn--ghost" type="button" onClick={handleBack}>
          取消
        </button>
        <button className="btn btn--primary btn--grow" type="button" onClick={handleSave}>
          保存计划
        </button>
      </div>

      <BulkSetSheet
        open={bulkIndex !== null}
        onClose={() => setBulkIndex(null)}
        exerciseName={
          bulkIndex !== null ? exercises[bulkIndex]?.name ?? '' : ''
        }
        initial={
          bulkIndex !== null
            ? exercises[bulkIndex]?.sets[0] ?? {
                weight: '',
                reps: '10',
                rest: String(settings.defaultRestSeconds),
              }
            : { weight: '', reps: '10', rest: String(settings.defaultRestSeconds) }
        }
        onApply={(values) => {
          if (bulkIndex === null) return;
          setExercises((current) =>
            current.map((exercise, index) =>
              index === bulkIndex
                ? {
                    ...exercise,
                    sets: exercise.sets.map((set) => ({ ...set, ...values })),
                  }
                : exercise,
            ),
          );
          markDirty();
        }}
      />

      <ExercisePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(exerciseDef) => {
          setExercises((current) => [
            ...current,
            {
              id: uid('pex'),
              name: exerciseDef.name,
              category: exerciseDef.category,
              sets: Array.from({ length: 3 }, () => ({
                weight: '',
                reps: '10',
                rest: String(settings.defaultRestSeconds),
              })),
            },
          ]);
          markDirty();
        }}
      />

      <ConfirmDialog
        open={deleteExerciseIndex !== null}
        title="删除这个动作？"
        message="当前动作的所有组设置都会被移除。"
        confirmLabel="删除动作"
        danger
        onConfirm={() => {
          if (deleteExerciseIndex !== null) removeExercise(deleteExerciseIndex);
          setDeleteExerciseIndex(null);
        }}
        onCancel={() => setDeleteExerciseIndex(null)}
      />

      <ConfirmDialog
        open={deletePlanOpen}
        title="删除这个计划？"
        message="计划模板会删除，已经安排到日历的训练和已完成记录不受影响。"
        confirmLabel="删除计划"
        danger
        onConfirm={() => {
          if (plan) deletePlan(plan.id);
          setDeletePlanOpen(false);
          navigate('/plans', { replace: true });
        }}
        onCancel={() => setDeletePlanOpen(false)}
      />

      <ConfirmDialog
        open={leaveOpen}
        title="放弃未保存的修改？"
        message="离开后这次修改不会保存。"
        confirmLabel="放弃修改"
        danger
        onConfirm={() => {
          setLeaveOpen(false);
          navigate(fallbackPath);
        }}
        onCancel={() => setLeaveOpen(false)}
      />
    </div>
  );
}
