import { useEffect, useState } from 'react';
import type { BodyMetric } from '../types';
import { todayStr } from '../lib/date';
import { uid } from '../lib/id';
import { Sheet } from './Sheet';

interface BodyMetricSheetProps {
  open: boolean;
  onClose: () => void;
  initial?: BodyMetric | null;
  onSave: (metric: BodyMetric) => void;
}

export function BodyMetricSheet({ open, onClose, initial, onSave }: BodyMetricSheetProps) {
  const [date, setDate] = useState(todayStr());
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [arm, setArm] = useState('');
  const [thigh, setThigh] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setDate(initial?.date ?? todayStr());
    setWeight(initial?.weightKg !== undefined ? String(initial.weightKg) : '');
    setWaist(initial?.waistCm !== undefined ? String(initial.waistCm) : '');
    setChest(initial?.chestCm !== undefined ? String(initial.chestCm) : '');
    setArm(initial?.armCm !== undefined ? String(initial.armCm) : '');
    setThigh(initial?.thighCm !== undefined ? String(initial.thighCm) : '');
    setNote(initial?.note ?? '');
    setError('');
  }, [open, initial]);

  const save = () => {
    const toNumber = (value: string): number | undefined => {
      if (!value.trim()) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
    };
    const metric: BodyMetric = {
      id: initial?.id ?? uid('body'),
      date,
      createdAt: initial?.createdAt ?? Date.now(),
      weightKg: toNumber(weight),
      waistCm: toNumber(waist),
      chestCm: toNumber(chest),
      armCm: toNumber(arm),
      thighCm: toNumber(thigh),
      note: note.trim() || undefined,
    };
    if (
      metric.weightKg === undefined &&
      metric.waistCm === undefined &&
      metric.chestCm === undefined &&
      metric.armCm === undefined &&
      metric.thighCm === undefined &&
      !metric.note
    ) {
      setError('至少填写一项身体数据');
      return;
    }
    onSave(metric);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? '编辑身体数据' : '记录身体数据'}
      subtitle="体重和围度会显示在趋势里"
      footer={
        <div className="button-row">
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            取消
          </button>
          <button className="btn btn--primary" type="button" onClick={save}>
            保存
          </button>
        </div>
      }
    >
      <label className="field">
        <span>日期</span>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </label>
      <div className="two-fields">
        <label className="field">
          <span>体重</span>
          <div className="input-with-suffix">
            <input
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              inputMode="decimal"
              placeholder="—"
            />
            <span>kg</span>
          </div>
        </label>
        <label className="field">
          <span>腰围</span>
          <div className="input-with-suffix">
            <input
              value={waist}
              onChange={(event) => setWaist(event.target.value)}
              inputMode="decimal"
              placeholder="—"
            />
            <span>cm</span>
          </div>
        </label>
      </div>
      <div className="two-fields">
        <label className="field">
          <span>胸围</span>
          <div className="input-with-suffix">
            <input
              value={chest}
              onChange={(event) => setChest(event.target.value)}
              inputMode="decimal"
              placeholder="—"
            />
            <span>cm</span>
          </div>
        </label>
        <label className="field">
          <span>臂围</span>
          <div className="input-with-suffix">
            <input
              value={arm}
              onChange={(event) => setArm(event.target.value)}
              inputMode="decimal"
              placeholder="—"
            />
            <span>cm</span>
          </div>
        </label>
      </div>
      <div className="two-fields">
        <label className="field">
          <span>腿围</span>
          <div className="input-with-suffix">
            <input
              value={thigh}
              onChange={(event) => setThigh(event.target.value)}
              inputMode="decimal"
              placeholder="—"
            />
            <span>cm</span>
          </div>
        </label>
      </div>
      <label className="field">
        <span>备注</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          placeholder="可选"
        />
      </label>
      {error && <p className="form-error">{error}</p>}
    </Sheet>
  );
}
