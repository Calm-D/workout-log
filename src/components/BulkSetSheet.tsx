import { useEffect, useState } from 'react';
import { Sheet } from './Sheet';

export interface BulkSetValues {
  weight: string;
  reps: string;
  rest: string;
}

interface BulkSetSheetProps {
  open: boolean;
  onClose: () => void;
  exerciseName: string;
  initial: BulkSetValues;
  onApply: (values: BulkSetValues) => void;
}

export function BulkSetSheet({
  open,
  onClose,
  exerciseName,
  initial,
  onApply,
}: BulkSetSheetProps) {
  const [weight, setWeight] = useState(initial.weight);
  const [reps, setReps] = useState(initial.reps);
  const [rest, setRest] = useState(initial.rest);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setWeight(initial.weight);
    setReps(initial.reps);
    setRest(initial.rest);
    setError('');
  }, [open]);

  const apply = () => {
    const parsedWeight = weight.trim() === '' ? null : Number(weight);
    const parsedReps = Number(reps);
    const parsedRest = Number(rest);
    if (parsedWeight !== null && (!Number.isFinite(parsedWeight) || parsedWeight < 0)) {
      setError('重量不正确');
      return;
    }
    if (!Number.isFinite(parsedReps) || parsedReps < 1 || parsedReps > 999) {
      setError('次数需要是 1-999 的整数');
      return;
    }
    if (!Number.isFinite(parsedRest) || parsedRest < 0 || parsedRest > 900) {
      setError('休息时间需要是 0-900 秒');
      return;
    }
    onApply({ weight, reps: String(Math.round(parsedReps)), rest: String(Math.round(parsedRest)) });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`统一设置 · ${exerciseName}`}
      subtitle="会覆盖本动作所有组的重量、次数和休息"
      footer={
        <div className="button-row">
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            取消
          </button>
          <button className="btn btn--primary" type="button" onClick={apply}>
            应用到全部组
          </button>
        </div>
      }
    >
      <div className="two-fields">
        <label className="field">
          <span>重量（留空为自重）</span>
          <div className="input-with-suffix">
            <input
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              inputMode="decimal"
              placeholder="自重"
              autoFocus
            />
            <span>kg</span>
          </div>
        </label>
        <label className="field">
          <span>次数</span>
          <div className="input-with-suffix">
            <input
              value={reps}
              onChange={(event) => setReps(event.target.value)}
              inputMode="numeric"
            />
            <span>次</span>
          </div>
        </label>
      </div>
      <label className="field">
        <span>组间休息</span>
        <div className="input-with-suffix">
          <input
            value={rest}
            onChange={(event) => setRest(event.target.value)}
            inputMode="numeric"
          />
          <span>秒</span>
        </div>
      </label>
      {error && <p className="form-error">{error}</p>}
    </Sheet>
  );
}
