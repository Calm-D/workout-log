import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../lib/store';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { Sheet } from '../components/Sheet';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ExercisePickerSheet } from '../components/ExercisePickerSheet';
import { formatClock, formatDurationShort } from '../lib/date';
import { useElapsed } from '../lib/hooks';
import {
  deriveExerciseStatus,
  exerciseStatusLabel,
  exerciseTargetSummary,
  handledSetCount,
  sessionStats,
} from '../lib/plan';
import { formatVolume } from '../lib/format';

export function WorkoutPage() {
  const navigate = useNavigate();
  const { sessionId = '' } = useParams();
  const session = useAppStore((state) =>
    state.sessions.find((item) => item.id === sessionId),
  );
  const finishSession = useAppStore((state) => state.finishSession);
  const deleteSession = useAppStore((state) => state.deleteSession);
  const addExerciseToSession = useAppStore((state) => state.addExerciseToSession);
  const elapsed = useElapsed(session?.startedAt);
  const [finishOpen, setFinishOpen] = useState(false);
  const [finishNote, setFinishNote] = useState('');
  const [discardOpen, setDiscardOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!session) {
    return (
      <div className="page">
        <PageHeader onBack={() => navigate('/')} title="训练不存在" />
        <EmptyState
          icon="alert"
          title="找不到这次训练"
          description="它可能已经被删除。"
          action={
            <button className="btn btn--primary" type="button" onClick={() => navigate('/')}>
              返回日历
            </button>
          }
        />
      </div>
    );
  }

  if (session.status !== 'active') {
    return (
      <div className="page">
        <PageHeader onBack={() => navigate(`/day/${session.date}`)} title={session.planName} />
        <EmptyState
          icon={session.status === 'completed' ? 'check' : 'play'}
          title={session.status === 'completed' ? '这次训练已完成' : '训练还没有开始'}
          description={
            session.status === 'completed'
              ? '可以到当天记录里查看每组数据。'
              : '先确认今天的重量和次数，再开始计时。'
          }
          action={
            <button
              className="btn btn--primary"
              type="button"
              onClick={() =>
                session.status === 'completed'
                  ? navigate(`/day/${session.date}`)
                  : navigate(`/confirm/session/${session.id}`)
              }
            >
              {session.status === 'completed' ? '查看记录' : '去确认训练'}
            </button>
          }
        />
      </div>
    );
  }

  const stats = sessionStats(session);
  const handledPercent = stats.totalSets
    ? Math.round((stats.handledSets / stats.totalSets) * 100)
    : 0;
  const exercises = [...session.exercises].sort((a, b) => a.order - b.order);

  const openFinish = () => {
    setFinishNote(session.note ?? '');
    setFinishOpen(true);
  };

  const confirmFinish = () => {
    finishSession(session.id, finishNote);
    setFinishOpen(false);
    navigate(`/day/${session.date}`, { replace: true });
  };

  return (
    <div className="page workout-page">
      <PageHeader
        onBack={() => navigate('/')}
        backLabel="最小化"
        title={session.planName}
        subtitle="训练中 · 计时继续"
        actions={
          <button className="text-button text-button--accent" type="button" onClick={openFinish}>
            结束
          </button>
        }
      />

      <section className="workout-hero">
        <div className="workout-hero__time">
          <span>训练计时</span>
          <strong>{formatClock(elapsed)}</strong>
        </div>
        <div className="workout-hero__progress">
          <div>
            <span>动作</span>
            <strong>
              {stats.completedExercises}
              <small>/{stats.totalExercises}</small>
            </strong>
          </div>
          <div>
            <span>组数</span>
            <strong>
              {stats.handledSets}
              <small>/{stats.totalSets}</small>
            </strong>
          </div>
          <div>
            <span>总容量</span>
            <strong>{stats.totalVolume > 0 ? formatVolume(stats.totalVolume) : '—'}</strong>
          </div>
        </div>
        <div className="thin-progress">
          <span style={{ width: `${handledPercent}%` }} />
        </div>
      </section>

      <div className="section-heading">
        <h2>训练动作</h2>
        <span>可自由选择顺序</span>
      </div>

      <div className="workout-todos">
        {exercises.map((exercise, index) => {
          const status = deriveExerciseStatus(exercise);
          const handled = handledSetCount(exercise);
          const percent = exercise.sets.length
            ? Math.round((handled / exercise.sets.length) * 100)
            : 0;
          return (
            <button
              key={exercise.id}
              className={`workout-todo workout-todo--${status}`}
              type="button"
              onClick={() => navigate(`/session/${session.id}/${exercise.id}`)}
            >
              <span className="todo-check">
                {status === 'completed' ? (
                  <Icon name="check" size={17} strokeWidth={2.6} />
                ) : status === 'skipped' ? (
                  <Icon name="minus" size={15} />
                ) : (
                  <span>{String(index + 1).padStart(2, '0')}</span>
                )}
              </span>
              <span className="todo-main">
                <span className="todo-title-row">
                  <strong>{exercise.name}</strong>
                  <span className={`status-pill status-pill--${status}`}>
                    {exerciseStatusLabel(status)}
                  </span>
                </span>
                <span className="todo-target">{exerciseTargetSummary(exercise)}</span>
                <span className="todo-progress">
                  <span className="todo-progress__bar">
                    <span style={{ width: `${percent}%` }} />
                  </span>
                  <span>
                    {handled}/{exercise.sets.length} 组
                  </span>
                </span>
              </span>
              <Icon name="chevronRight" size={18} className="todo-chevron" />
            </button>
          );
        })}

        {!exercises.length && (
          <EmptyState
            icon="dumbbell"
            title="还没有动作"
            description="添加一个动作开始记录。"
          />
        )}
      </div>

      <div className="workout-actions">
        <button className="btn btn--soft btn--full" type="button" onClick={() => setPickerOpen(true)}>
          <Icon name="plus" size={17} />
          添加动作
        </button>
        <p className="workout-end-hint">练完后点右上角「结束」保存这次训练</p>
      </div>

      <Sheet
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        title="结束这次训练？"
        subtitle={`${formatClock(elapsed)} · ${session.planName}`}
        footer={
          <div className="button-row">
            <button className="btn btn--ghost" type="button" onClick={() => setFinishOpen(false)}>
              继续训练
            </button>
            <button className="btn btn--primary" type="button" onClick={confirmFinish}>
              确认结束
            </button>
          </div>
        }
      >
        <div className="finish-stats">
          <div>
            <span>时长</span>
            <strong>{formatDurationShort(elapsed)}</strong>
          </div>
          <div>
            <span>完成动作</span>
            <strong>
              {stats.completedExercises}/{stats.totalExercises}
            </strong>
          </div>
          <div>
            <span>完成组数</span>
            <strong>
              {stats.doneSets + stats.partialSets}/{stats.totalSets}
            </strong>
          </div>
        </div>
        {stats.pendingSets > 0 && (
          <div className="notice notice--soft">
            <Icon name="alert" size={16} />
            <p>还有 {stats.pendingSets} 组未处理，结束后会标记为跳过。</p>
          </div>
        )}
        <label className="field">
          <span>训练备注</span>
          <textarea
            value={finishNote}
            onChange={(event) => setFinishNote(event.target.value)}
            rows={3}
            placeholder="今天感觉怎么样？"
          />
        </label>
        <button className="text-button button-danger-text" type="button" onClick={() => setDiscardOpen(true)}>
          放弃本次训练（不保存）
        </button>
      </Sheet>

      <ConfirmDialog
        open={discardOpen}
        title="放弃本次训练？"
        message="这次训练的所有组记录和计时都会被删除，无法恢复。"
        confirmLabel="放弃"
        danger
        onConfirm={() => {
          deleteSession(session.id);
          setDiscardOpen(false);
          setFinishOpen(false);
          navigate('/', { replace: true });
        }}
        onCancel={() => setDiscardOpen(false)}
      />

      <ExercisePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(exercise) => {
          const added = addExerciseToSession(session.id, exercise);
          setPickerOpen(false);
          if (added) navigate(`/session/${session.id}/${added.id}`);
        }}
      />
    </div>
  );
}
