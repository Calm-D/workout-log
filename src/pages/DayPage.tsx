import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { WorkoutSession } from '../types';
import { useAppStore } from '../lib/store';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  dateLabel,
  formatDurationShort,
  formatTimeHM,
  isPast,
  isToday,
  todayStr,
} from '../lib/date';
import { useElapsed } from '../lib/hooks';
import {
  exerciseSummary,
  exerciseTargetSummary,
  sessionStats,
  setStatusLabel,
  toPlanFromSession,
} from '../lib/plan';
import { formatVolume, formatWeight } from '../lib/format';

function RecordExerciseRow({ session }: { session: WorkoutSession }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return (
    <div className="record-exercises">
      {session.exercises.map((exercise) => {
        const summary = exerciseSummary(exercise);
        const expanded = expandedId === exercise.id;
        const hasNote = Boolean(exercise.note) || exercise.sets.some((set) => set.note);
        return (
          <div className="record-exercise-wrap" key={exercise.id}>
            <button
              className={`record-exercise ${expanded ? 'is-open' : ''}`}
              type="button"
              onClick={() => setExpandedId(expanded ? null : exercise.id)}
            >
              <div className="record-exercise__content">
                <span className="record-exercise__name">{exercise.name}</span>
                <span className="record-exercise__line">
                  {summary.mixedWeight ? (
                    summary.segments.map((segment, index) => (
                      <span
                        key={`${exercise.id}-${index}`}
                        className={`rep-segment ${
                          segment.partial ? 'is-partial' : segment.skipped ? 'is-skipped' : ''
                        }`}
                      >
                        {segment.weightLabel}×{segment.repsLabel}
                        {index < summary.segments.length - 1 ? ' / ' : ''}
                      </span>
                    ))
                  ) : (
                    <>
                      <span className="record-exercise__weight">{summary.weightLabel}</span>
                      <span className="record-exercise__reps">
                        {summary.segments.map((segment, index) => (
                          <span
                            key={`${exercise.id}-${index}`}
                            className={`rep-segment ${
                              segment.partial
                                ? 'is-partial'
                                : segment.skipped
                                  ? 'is-skipped'
                                  : ''
                            }`}
                          >
                            {segment.repsLabel}
                            {index < summary.segments.length - 1 ? '/' : ''}
                          </span>
                        ))}
                      </span>
                    </>
                  )}
                  {hasNote && <Icon name="note" size={13} className="record-note-icon" />}
                </span>
              </div>
              <Icon
                name="chevronDown"
                size={16}
                className={`record-chevron ${expanded ? 'is-open' : ''}`}
              />
            </button>
            {expanded && (
              <div className="record-set-details">
                {exercise.sets.map((set, index) => (
                  <div className="record-set-row" key={set.id}>
                    <span className="record-set-index">第{index + 1}组</span>
                    <span className="record-set-value">
                      {set.status === 'skipped'
                        ? '—'
                        : `${formatWeight(
                            set.actualWeightKg === undefined
                              ? set.targetWeightKg
                              : set.actualWeightKg,
                          )} × ${set.actualReps ?? set.targetReps}次`}
                    </span>
                    <span className={`set-status set-status--${set.status}`}>
                      {setStatusLabel(set.status)}
                    </span>
                    {set.note && <p className="record-set-note">{set.note}</p>}
                  </div>
                ))}
                {exercise.note && (
                  <p className="record-exercise-note">动作备注：{exercise.note}</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface RecordCardProps {
  session: WorkoutSession;
  onRepeat: (session: WorkoutSession) => void;
  onSavePlan: (session: WorkoutSession) => void;
  onDelete: (session: WorkoutSession) => void;
}

function SessionRecordCard({ session, onRepeat, onSavePlan, onDelete }: RecordCardProps) {
  const stats = sessionStats(session);
  return (
    <article className="record-card">
      <div className="record-card__head">
        <div>
          <div className="record-card__title-row">
            <h2>{session.planName}</h2>
            <span className="status-pill status-pill--done">
              <Icon name="check" size={12} strokeWidth={2.6} />
              已完成
            </span>
          </div>
          <p className="record-card__meta">
            {formatTimeHM(session.startedAt)} – {formatTimeHM(session.endedAt)}
          </p>
        </div>
        <span className="record-card__duration">{formatDurationShort(stats.durationMs)}</span>
      </div>

      <div className="record-stats">
        <div>
          <span>总容量</span>
          <strong>{stats.totalVolume > 0 ? formatVolume(stats.totalVolume) : '—'}</strong>
        </div>
        <div>
          <span>完成组数</span>
          <strong>
            {stats.doneSets + stats.partialSets}
            <small>/{stats.totalSets}</small>
          </strong>
        </div>
        <div>
          <span>完成动作</span>
          <strong>
            {stats.completedExercises}
            <small>/{stats.totalExercises}</small>
          </strong>
        </div>
      </div>

      <RecordExerciseRow session={session} />

      {stats.partialSets > 0 && (
        <p className="record-legend">
          <span className="rep-segment is-partial">*</span> 表示该组未完成，点动作可查看实际次数和备注
        </p>
      )}

      {session.note && (
        <div className="record-note">
          <Icon name="note" size={14} />
          <p>{session.note}</p>
        </div>
      )}

      <div className="record-actions">
        <button className="btn btn--soft btn--small" type="button" onClick={() => onRepeat(session)}>
          <Icon name="refresh" size={15} />
          再练一次
        </button>
        <button
          className="btn btn--ghost btn--small"
          type="button"
          onClick={() => onSavePlan(session)}
        >
          <Icon name="copy" size={15} />
          另存为计划
        </button>
        <button
          className="btn btn--ghost btn--small btn--danger-text"
          type="button"
          onClick={() => onDelete(session)}
        >
          <Icon name="trash" size={15} />
          删除
        </button>
      </div>
    </article>
  );
}

export function DayPage() {
  const navigate = useNavigate();
  const { date = todayStr() } = useParams();
  const sessions = useAppStore((state) => state.sessions);
  const plans = useAppStore((state) => state.plans);
  const savePlan = useAppStore((state) => state.savePlan);
  const deleteSession = useAppStore((state) => state.deleteSession);
  const showToast = useAppStore((state) => state.showToast);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutSession | null>(null);

  const daySessions = useMemo(
    () =>
      sessions
        .filter((session) => session.date === date)
        .sort((a, b) => {
          const rank = { active: 0, planned: 1, completed: 2 } as const;
          const diff = rank[a.status] - rank[b.status];
          if (diff !== 0) return diff;
          return (b.endedAt ?? b.createdAt) - (a.endedAt ?? a.createdAt);
        }),
    [sessions, date],
  );
  const active = daySessions.find((session) => session.status === 'active');
  const planned = daySessions.find((session) => session.status === 'planned');
  const completed = daySessions.filter((session) => session.status === 'completed');
  const elapsed = useElapsed(active?.startedAt);

  const repeatSession = (session: WorkoutSession) => {
    const running = sessions.find((item) => item.status === 'active');
    if (running) {
      showToast('已有进行中的训练');
      navigate(`/session/${running.id}`);
      return;
    }
    const existingPlan = session.planId
      ? plans.find((plan) => plan.id === session.planId)
      : undefined;
    const plan = existingPlan ?? toPlanFromSession(session, session.planName);
    if (!existingPlan) savePlan(plan);
    navigate(`/confirm/plan/${plan.id}/${todayStr()}`);
  };

  const saveAsPlan = (session: WorkoutSession) => {
    const plan = toPlanFromSession(session, session.planName);
    savePlan(plan);
    showToast('已保存为计划');
  };

  const headerSubtitle = active
    ? '训练正在后台计时'
    : planned
      ? '这一天已有安排'
      : completed.length
        ? `${completed.length} 条训练记录`
        : '还没有训练记录';

  return (
    <div className="page day-page">
      <PageHeader
        onBack={() => navigate('/')}
        title={dateLabel(date)}
        subtitle={headerSubtitle}
        actions={
          !active && !planned && !isPast(date) ? (
            <button
              className="icon-button"
              type="button"
              onClick={() => navigate(`/pick/${date}`)}
              aria-label="选择训练方案"
            >
              <Icon name="plus" size={22} />
            </button>
          ) : null
        }
      />

      {active && (
        <article className="today-card today-card--active day-active-card">
          <div className="today-card__top">
            <span className="status-pill status-pill--live">
              <span className="live-dot" />
              训练中
            </span>
            <span className="today-card__time">{formatDurationShort(elapsed)}</span>
          </div>
          <h3>{active.planName}</h3>
          <p className="today-card__meta">
            {active.exercises.length} 个动作 · 计时仍在继续
          </p>
          <button
            className="btn btn--primary btn--full"
            type="button"
            onClick={() => navigate(`/session/${active.id}`)}
          >
            继续训练
            <Icon name="chevronRight" size={18} />
          </button>
        </article>
      )}

      {planned && (
        <article className="plan-preview-card">
          <div className="plan-preview-card__head">
            <div>
              <span
                className={`status-pill ${
                  isPast(date) ? 'status-pill--muted' : 'status-pill--planned'
                }`}
              >
                {isPast(date) ? '未完成的计划' : isToday(date) ? '今日计划' : '已安排'}
              </span>
              <h2>{planned.planName}</h2>
            </div>
            <span className="plan-preview-card__count">
              {planned.exercises.length} 个动作
            </span>
          </div>
          <div className="plan-preview-list">
            {planned.exercises.map((exercise, index) => (
              <div className="plan-preview-row" key={exercise.id}>
                <span className="order-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="plan-preview-row__name">{exercise.name}</span>
                <span className="plan-preview-row__target">
                  {exerciseTargetSummary(exercise)}
                </span>
              </div>
            ))}
          </div>
          {planned.note && (
            <div className="record-note">
              <Icon name="note" size={14} />
              <p>{planned.note}</p>
            </div>
          )}
          <div className="button-row">
            {isToday(date) ? (
              <button
                className="btn btn--primary"
                type="button"
                onClick={() => navigate(`/confirm/session/${planned.id}`)}
              >
                开始训练
              </button>
            ) : !isPast(date) ? (
              <button
                className="btn btn--primary"
                type="button"
                onClick={() => navigate(`/confirm/session/${planned.id}`)}
              >
                调整目标
              </button>
            ) : null}
            {!isPast(date) && (
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => navigate(`/pick/${date}`)}
              >
                更换方案
              </button>
            )}
            <button
              className="btn btn--ghost btn--danger-text"
              type="button"
              onClick={() => setDeleteTarget(planned)}
            >
              删除计划
            </button>
          </div>
        </article>
      )}

      {completed.map((session) => (
        <SessionRecordCard
          key={session.id}
          session={session}
          onRepeat={repeatSession}
          onSavePlan={saveAsPlan}
          onDelete={setDeleteTarget}
        />
      ))}

      {!active && !planned && !completed.length && (
        <EmptyState
          icon={isPast(date) ? 'calendar' : 'dumbbell'}
          title={isPast(date) ? '这天没有训练记录' : '这天还没有安排'}
          description={
            isPast(date)
              ? '可以回到日历看看其他训练日。'
              : '选一个训练方案，确认重量和次数后开始。'
          }
          action={
            isPast(date) ? (
              <button className="btn btn--soft" type="button" onClick={() => navigate('/')}>
                返回日历
              </button>
            ) : (
              <button
                className="btn btn--primary"
                type="button"
                onClick={() => navigate(`/pick/${date}`)}
              >
                选择训练方案
              </button>
            )
          }
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget?.status === 'completed' ? '删除这条训练记录？' : '删除这个训练计划？'}
        message={
          deleteTarget?.status === 'completed'
            ? '删除后无法恢复，趋势图也会少一条记录。'
            : '删除后这一天将不再显示训练安排。'
        }
        confirmLabel="删除"
        danger
        onConfirm={() => {
          if (deleteTarget) deleteSession(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
