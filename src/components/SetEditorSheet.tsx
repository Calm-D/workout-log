import { useEffect, useState } from 'react';
import type { SessionExercise, SessionSet, SetRecordInput, SetStatus } from '../types';
import { formatWeight } from '../lib/format';
import { Sheet } from './Sheet';

interface SetEditorSheetProps {
  open: boolean;
  onClose: () => void;
  exercise: SessionExercise;
  set: SessionSet | null;
  onSave: (data: SetRecordInput) => void;
  readOnly?: boolean;
}

const QUICK_TAGS = ['力竭', '重量偏大', '动作变形', '时间不够'];

export function SetEditorSheet({
  open,
  onClose,
  exercise,
  set,
  onSave,
  readOnly,
}: SetEditorSheetProps) {
  const [status, setStatus] = useState<SetStatus>('done');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open || !set) return;
    setStatus(set.status === 'pending' ? 'done' : set.status);
    const effectiveWeight =
      set.actualWeightKg === undefined ? set.targetWeightKg : set.actualWeightKg;
    setWeight(effectiveWeight === null ? '' : String(effectiveWeight));
    setReps(String(set.actualReps ?? set.targetReps));
    setNote(set.note ?? '');
  }, [open, set]);

  if (!set) return null;

  const addTag = (tag: string) => {
    setNote((current) => {
      if (!current) return tag;
      if (current.includes(tag)) return current;
      return `${current} ${tag}`;
    });
  };

  const save = () => {
    const parsedWeight = weight.trim() === '' ? null : Number(weight);
    const parsedReps = Number(reps);
    if (parsedWeight !== null && (!Number.isFinite(parsedWeight) || parsedWeight < 0)) return;
    if (status !== 'skipped' && (!Number.isFinite(parsedReps) || parsedReps < 0)) return;
    onSave({
      status: status === 'pending' ? 'done' : status,
      actualWeightKg: status === 'skipped' ? null : parsedWeight,
      actualReps: status === 'skipped' ? 0 : Math.round(parsedReps),
      note,
    });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`${exercise.name} · 记录本组`}
      subtitle={`目标 ${formatWeight(set.targetWeightKg)} × ${set.targetReps}次`}
      footer={
        readOnly ? (
          <button className="btn btn--ghost btn--full" type="button" onClick={onClose}>
            关闭
          </button>
        ) : (
          <div className="button-row">
            <button className="btn btn--ghost" type="button" onClick={onClose}>
              取消
            </button>
            <button className="btn btn--primary" type="button" onClick={save}>
              保存本组
            </button>
          </div>
        )
      }
    >
      <div className="field">
        <span>本组状态</span>
        <div className="segmented">
          <button
            className={status === 'done' ? 'is-active' : ''}
            type="button"
            onClick={() => setStatus('done')}
          >
            完成
          </button>
          <button
            className={status === 'partial' ? 'is-active' : ''}
            type="button"
            onClick={() => setStatus('partial')}
          >
            未完成
          </button>
          <button
            className={status === 'skipped' ? 'is-active' : ''}
            type="button"
            onClick={() => setStatus('skipped')}
          >
            跳过
          </button>
        </div>
      </div>

      {status !== 'skipped' && (
        <div className="two-fields">
          <label className="field">
            <span>实际重量</span>
            <div className="input-with-suffix">
              <input
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
                inputMode="decimal"
                placeholder="自重"
                disabled={readOnly}
              />
              <span>kg</span>
            </div>
          </label>
          <label className="field">
            <span>实际次数</span>
            <div className="input-with-suffix">
              <input
                value={reps}
                onChange={(event) => setReps(event.target.value)}
                inputMode="numeric"
                placeholder={String(set.targetReps)}
                disabled={readOnly}
              />
              <span>次</span>
            </div>
          </label>
        </div>
      )}

      {status === 'skipped' && (
        <p className="form-hint">这组会标记为跳过，不计入完成次数。</p>
      )}

      <label className="field">
        <span>备注</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="这一组感觉怎么样？为什么没做完？"
          rows={3}
          disabled={readOnly}
        />
      </label>
      {status !== 'skipped' && (
        <div className="chip-row">
          {QUICK_TAGS.map((tag) => (
            <button
              key={tag}
              className="chip chip--small"
              type="button"
              onClick={() => addTag(tag)}
              disabled={readOnly}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
