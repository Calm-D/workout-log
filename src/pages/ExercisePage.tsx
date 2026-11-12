import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../lib/store';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { SetEditorSheet } from '../components/SetEditorSheet';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Sheet } from '../components/Sheet';
import {
  deriveExerciseStatus,
  exerciseStatusLabel,
  exerciseTargetSummary,
  handledSetCount,
} from '../lib/plan';
import { formatRest, formatWeight } from '../lib/format';

export function ExercisePage() {
  const navigate = useNavigate();
  const { sessionId = '', exerciseId = '' } = useParams();
  const session = useAppStore((state) =>
    state.sessions.find((item) => item.id === sessionId),
  );
  const exercise = session?.exercises.find((item) => item.id === exerciseId);
  const quickCompleteSet = useAppStore((state) => state.quickCompleteSet);
  const saveSetRecord = useAppStore((state) => state.saveSetRecord);
  const addSetAction = useAppStore((state) => state.addSet);
  const skipRemainingSets = useAppStore((state) => state.skipRemainingSets);
  const updateExerciseNote = useAppStore((state) => state.updateExerciseNote);

  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [skipOpen, setSkipOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  if (!session || !exercise) {
    return (
      <div className="page">
        <PageHeader onBack={() => navigate('/')} title="动作不存在" />
        <EmptyState
          icon="alert"
          title="找不到这个动作"
          description="它可能已经被删除。"
        />
      </div>
    );
  }

  if (session.status !== 'active') {
    return (
      <div className="page">
        <PageHeader
          onBack={() => navigate(`/day/${session.date}`)}
          title={exercise.name}
        />
        <EmptyState
          icon="check"
          title="这次训练已经结束"
          description="可以到当天记录里查看完整数据。"
          action={
            <button
              className="btn btn--primary"
              type="button"
              onClick={() => navigate(`/day/${session.date}`)}
            >
              查看训练记录
            </button>
          }
        />
      </div>
    );
  }

  const status = deriveExerciseStatus(exercise);
  const handled = handledSetCount(exercise);
  const pendingCount = exercise.sets.filter((set) => set.status === 'pending').length;
  const editingSet = exercise.sets.find((set) => set.id === editingSetId) ?? null;
  const doneCount = exercise.sets.filter((set) => set.status === 'done').length;
  const partialCount = exercise.sets.filter((set) => set.status === 'partial').length;
  const skippedCount = exercise.sets.filter((set) => set.status === 'skipped').length;
  const firstPendingId = exercise.sets.find((set) => set.status === 'pending')?.id;

  const handleCheck = (setId: string) => {
    const set = exercise.sets.find((item) => item.id === setId);
    if (!set) return;
    if (set.status === 'pending') {
      quickCompleteSet(session.id, exercise.id, setId);
    } else {
      setEditingSetId(setId);
    }
  };

  const openNote = () => {
    setNoteDraft(exercise.note ?? '');
    setNoteOpen(true);
  };

  return (
    <div className="page exercise-page">
      <PageHeader
        onBack={() => navigate(`/session/${session.id}`)}
        title={exercise.name}
        subtitle={`${exerciseTargetSummary(exercise)} · ${exerciseStatusLabel(status)}`}
        actions={
          <button className="icon-button" type="button" onClick={openNote} aria-label="动作备注">
            <Icon name="note" size={20} />
          </button>
        }
      />

      <section className="exercise-progress-card">
        <div>
          <span>完成进度</span>
          <strong>
            {handled}
            <small>/{exercise.sets.length} 组</small>
          </strong>
        </div>
        <div className="exercise-progress-card__right">
          <span className={`status-pill status-pill--${status}`}>
            {exerciseStatusLabel(status)}
          </span>
          <span className="exercise-progress-card__hint">
            {pendingCount > 0 ? `还剩 ${pendingCount} 组` : '所有组已记录'}
          </span>
        </div>
      </section>

      <p className="interaction-hint">
        点方框快速完成；点这一行的其他位置可改实际次数、标记未完成或写备注。
      </p>

      <div className="set-list">
        {exercise.sets.map((set, index) => {
          const isPending = set.status === 'pending';
          const weight = isPending
            ? set.targetWeightKg
            : set.actualWeightKg === undefined
              ? set.targetWeightKg
              : set.actualWeightKg;
          const reps = isPending ? set.targetReps : set.actualReps ?? set.targetReps;
          const current = isPending && set.id === firstPendingId;
          return (
            <div
              className={`set-row set-row--${set.status} ${current ? 'is-current' : ''}`}
              key={set.id}
            >
              <button
                className="set-check"
                type="button"
                onClick={() => handleCheck(set.id)}
                aria-label={
                  isPending ? `完成${exercise.name}第${index + 1}组` : `编辑第${index + 1}组`
                }
              >
                {set.status === 'done' ? (
                  <Icon name="check" size={18} strokeWidth={2.8} />
                ) : set.status === 'partial' ? (
                  <Icon name="minus" size={16} strokeWidth={2.8} />
                ) : set.status === 'skipped' ? (
                  <Icon name="skip" size={15} />
                ) : (
                  <span className="set-check__ring" />
                )}
              </button>
              <button
                className="set-main"
                type="button"
                onClick={() => setEditingSetId(set.id)}
              >
                <span className="set-main__top">
                  <span className="set-index">第{index + 1}组</span>
                  <span className="set-values">
                    {set.status === 'skipped' ? (
                      <span className="set-skipped-label">已跳过</span>
                    ) : (
                      <>
                        <strong>{formatWeight(weight)}</strong>
                        <span className="set-times">×</span>
                        <strong>
                          {set.status === 'partial'
                            ? `${reps}/${set.targetReps}`
                            : reps}
                        </strong>
                        <span className="set-unit">次</span>
                      </>
                    )}
                  </span>
                  {set.status !== 'pending' && set.status !== 'done' && (
                    <span className={`set-status set-status--${set.status}`}>
                      {set.status === 'partial' ? '未完成' : '跳过'}
                    </span>
                  )}
                </span>
                <span className="set-main__bottom">
                  <span>休息 {formatRest(set.restSeconds)}</span>
                  {set.note && <span className="set-note-preview">{set.note}</span>}
                </span>
              </button>
              <span className="set-chevron">
                <Icon name="chevronRight" size={16} />
              </span>
            </div>
          );
        })}
      </div>

      <button
        className="btn btn--soft btn--full add-set-button"
        type="button"
        onClick={() => addSetAction(session.id, exercise.id)}
      >
        <Icon name="plus" size={17} />
        添加一组
      </button>

      {exercise.note && (
        <div className="record-note exercise-note-card">
          <Icon name="note" size={14} />
          <p>{exercise.note}</p>
        </div>
      )}

      {status === 'completed' || status === 'skipped' ? (
        <div className="exercise-complete-card">
          <div className="exercise-complete-card__icon">
            <Icon name="check" size={24} strokeWidth={2.6} />
          </div>
          <div>
            <h3>{status === 'skipped' ? '动作已跳过' : '动作已完成'}</h3>
            <p>
              完成 {doneCount} 组
              {partialCount > 0 ? ` · 未完成 ${partialCount} 组` : ''}
              {skippedCount > 0 ? ` · 跳过 ${skippedCount} 组` : ''}
            </p>
          </div>
          <button
            className="btn btn--primary"
            type="button"
            onClick={() => navigate(`/session/${session.id}`)}
          >
            返回动作列表
          </button>
        </div>
      ) : (
        <button
          className="text-button button-danger-text skip-exercise-button"
          type="button"
          onClick={() => setSkipOpen(true)}
        >
          结束动作并跳过剩余 {pendingCount} 组
        </button>
      )}

      <SetEditorSheet
        open={Boolean(editingSet)}
        onClose={() => setEditingSetId(null)}
        exercise={exercise}
        set={editingSet}
        onSave={(data) => {
          if (!editingSet) return;
          saveSetRecord(session.id, exercise.id, editingSet.id, data);
        }}
      />

      <ConfirmDialog
        open={skipOpen}
        title="结束这个动作？"
        message={`剩余 ${pendingCount} 组会标记为跳过，之后可以继续练下一个动作。`}
        confirmLabel="跳过剩余组"
        danger
        onConfirm={() => {
          skipRemainingSets(session.id, exercise.id);
          setSkipOpen(false);
        }}
        onCancel={() => setSkipOpen(false)}
      />

      <Sheet
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="动作备注"
        subtitle={exercise.name}
        footer={
          <div className="button-row">
            <button className="btn btn--ghost" type="button" onClick={() => setNoteOpen(false)}>
              取消
            </button>
            <button
              className="btn btn--primary"
              type="button"
              onClick={() => {
                updateExerciseNote(session.id, exercise.id, noteDraft);
                setNoteOpen(false);
              }}
            >
              保存备注
            </button>
          </div>
        }
      >
        <label className="field">
          <span>本次动作的感受</span>
          <textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            rows={4}
            placeholder="例如：肩膀有点紧，下次先热身久一点"
            autoFocus
          />
        </label>
      </Sheet>
    </div>
  );
}
