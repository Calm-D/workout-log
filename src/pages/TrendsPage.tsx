import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BodyMetric } from '../types';
import { useAppStore } from '../lib/store';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { LineChart } from '../components/LineChart';
import { BodyMetricSheet } from '../components/BodyMetricSheet';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  bestTrendValue,
  bodyMetricTrend,
  exerciseNamesFromPlans,
  exerciseTrend,
  latestTrendDelta,
  type TrendMetric,
} from '../lib/stats';
import {
  formatNumber,
  formatVolume,
} from '../lib/format';
import { shortDate } from '../lib/date';

const METRIC_LABELS: Array<{ key: TrendMetric; label: string }> = [
  { key: 'maxWeight', label: '最大重量' },
  { key: 'volume', label: '总容量' },
  { key: 'reps', label: '总次数' },
];

const BODY_METRICS: Array<{
  key: 'weightKg' | 'waistCm' | 'chestCm' | 'armCm' | 'thighCm';
  label: string;
  unit: string;
}> = [
  { key: 'weightKg', label: '体重', unit: 'kg' },
  { key: 'waistCm', label: '腰围', unit: 'cm' },
  { key: 'chestCm', label: '胸围', unit: 'cm' },
  { key: 'armCm', label: '臂围', unit: 'cm' },
  { key: 'thighCm', label: '腿围', unit: 'cm' },
];

export function TrendsPage() {
  const navigate = useNavigate();
  const sessions = useAppStore((state) => state.sessions);
  const plans = useAppStore((state) => state.plans);
  const bodyMetrics = useAppStore((state) => state.bodyMetrics);
  const upsertBodyMetric = useAppStore((state) => state.upsertBodyMetric);
  const deleteBodyMetric = useAppStore((state) => state.deleteBodyMetric);

  const [tab, setTab] = useState<'exercise' | 'body'>('body');
  const [metric, setMetric] = useState<TrendMetric>('maxWeight');
  const [bodyMetric, setBodyMetric] = useState<(typeof BODY_METRICS)[number]['key']>('weightKg');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [bodySheetOpen, setBodySheetOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<BodyMetric | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BodyMetric | null>(null);

  const activePlanIds = useMemo(
    () =>
      new Set(
        sessions
          .filter((session) => session.status === 'active' && session.planId)
          .map((session) => session.planId as string),
      ),
    [sessions],
  );
  const exerciseNames = useMemo(
    () =>
      exerciseNamesFromPlans(
        plans.filter(
          (plan) => !plan.sample || (plan.id !== undefined && activePlanIds.has(plan.id)),
        ),
      ),
    [plans, activePlanIds],
  );
  const currentExercise = exerciseNames.includes(selectedExercise)
    ? selectedExercise
    : exerciseNames[0] ?? '';
  const points = useMemo(
    () => exerciseTrend(sessions, currentExercise, metric),
    [sessions, currentExercise, metric],
  );
  const bodyPoints = useMemo(
    () => bodyMetricTrend(bodyMetrics, bodyMetric),
    [bodyMetrics, bodyMetric],
  );
  const latest = points[points.length - 1]?.value ?? null;
  const best = bestTrendValue(points);
  const delta = latestTrendDelta(points);
  const bodyInfo = BODY_METRICS.find((item) => item.key === bodyMetric)!;
  const bodyLatest = bodyPoints[bodyPoints.length - 1]?.value ?? null;
  const bodyBest = bestTrendValue(bodyPoints);
  const bodyDelta = latestTrendDelta(bodyPoints);

  const formatExerciseValue = (value: number) => {
    if (metric === 'maxWeight') return `${formatNumber(value)}kg`;
    if (metric === 'volume') return formatVolume(value);
    return `${formatNumber(value)}次`;
  };

  const formatBodyValue = (value: number) => `${formatNumber(value)}${bodyInfo.unit}`;

  const sortedBodyMetrics = useMemo(
    () => [...bodyMetrics].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [bodyMetrics],
  );

  return (
    <div className="page trends-page">
      <PageHeader
        title="趋势"
        subtitle="看身体变化，也看动作进步"
        eyebrow="INSIGHTS"
      />

      <div className="segmented segmented--tabs">
        <button
          className={tab === 'body' ? 'is-active' : ''}
          type="button"
          onClick={() => setTab('body')}
        >
          身体
        </button>
        <button
          className={tab === 'exercise' ? 'is-active' : ''}
          type="button"
          onClick={() => setTab('exercise')}
        >
          动作
        </button>
      </div>

      {tab === 'exercise' ? (
        !exerciseNames.length ? (
          <EmptyState
            icon="chart"
            title="还没有可看的动作"
            description="趋势只统计你在训练计划里添加过的动作。先去计划里添加动作，训练后这里就会出现数据。"
            action={
              <button className="btn btn--primary" type="button" onClick={() => navigate('/plans')}>
                去计划库添加
              </button>
            }
          />
        ) : (
          <>
            <div className="trend-select-card">
              <label className="field field--inline">
                <span>动作</span>
                <select
                  value={currentExercise}
                  onChange={(event) => setSelectedExercise(event.target.value)}
                >
                  {exerciseNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="segmented segmented--compact">
                {METRIC_LABELS.map((item) => (
                  <button
                    key={item.key}
                    className={metric === item.key ? 'is-active' : ''}
                    type="button"
                    onClick={() => setMetric(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="form-hint trend-source-hint">只显示训练计划里添加过的动作</p>

            <section className="chart-card">
              <div className="chart-card__head">
                <div>
                  <span>最近趋势</span>
                  <strong>
                    {latest === null ? '—' : formatExerciseValue(latest)}
                  </strong>
                </div>
                <div className="chart-card__stats">
                  <span>
                    最佳 <strong>{best === null ? '—' : formatExerciseValue(best)}</strong>
                  </span>
                  {delta !== null && (
                    <span className={delta >= 0 ? 'is-up' : 'is-down'}>
                      {delta >= 0 ? '+' : ''}
                      {formatExerciseValue(delta)}
                    </span>
                  )}
                </div>
              </div>
              {!points.length && metric === 'maxWeight' ? (
                <div className="chart-empty">
                  这个动作没有负重数据，可以切换到「总次数」查看。
                </div>
              ) : (
                <LineChart
                  points={points}
                  valueFormatter={formatExerciseValue}
                  emptyText="还没有足够的训练数据"
                />
              )}
            </section>

            {points.length > 0 && (
              <section className="trend-history">
                <div className="section-heading">
                  <h2>最近记录</h2>
                  <span>{currentExercise}</span>
                </div>
                {[...points]
                  .slice(-6)
                  .reverse()
                  .map((point) => (
                    <div className="trend-history-row" key={point.date}>
                      <span>{shortDate(point.date)}</span>
                      <strong>{formatExerciseValue(point.value)}</strong>
                    </div>
                  ))}
              </section>
            )}
          </>
        )
      ) : (
        <>
          <div className="trend-select-card">
            <div className="segmented segmented--wrap">
              {BODY_METRICS.map((item) => (
                <button
                  key={item.key}
                  className={bodyMetric === item.key ? 'is-active' : ''}
                  type="button"
                  onClick={() => setBodyMetric(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <section className="chart-card">
            <div className="chart-card__head">
              <div>
                <span>{bodyInfo.label}趋势</span>
                <strong>{bodyLatest === null ? '—' : formatBodyValue(bodyLatest)}</strong>
              </div>
              <div className="chart-card__stats">
                <span>
                  最佳 <strong>{bodyBest === null ? '—' : formatBodyValue(bodyBest)}</strong>
                </span>
                {bodyDelta !== null && (
                  <span className={bodyDelta >= 0 ? 'is-up' : 'is-down'}>
                    {bodyDelta >= 0 ? '+' : ''}
                    {formatBodyValue(bodyDelta)}
                  </span>
                )}
              </div>
            </div>
            <LineChart
              points={bodyPoints}
              valueFormatter={formatBodyValue}
              emptyText="还没有身体数据"
            />
            <button
              className="btn btn--soft btn--full"
              type="button"
              onClick={() => {
                setEditingMetric(null);
                setBodySheetOpen(true);
              }}
            >
              <Icon name="plus" size={17} />
              记录身体数据
            </button>
          </section>

          <section className="body-history">
            <div className="section-heading">
              <h2>历史记录</h2>
              <span>{bodyMetrics.length} 条</span>
            </div>
            {!sortedBodyMetrics.length ? (
              <EmptyState
                icon="activity"
                title="还没有身体数据"
                description="记录体重或围度，过一段时间就能看到变化趋势。"
              />
            ) : (
              sortedBodyMetrics.map((item) => (
                <div className="body-history-row" key={item.id}>
                  <button
                    className="body-history-main"
                    type="button"
                    onClick={() => {
                      setEditingMetric(item);
                      setBodySheetOpen(true);
                    }}
                  >
                    <span className="body-history-date">{shortDate(item.date)}</span>
                    <span className="body-history-values">
                      {item.weightKg !== undefined && <span>体重 {item.weightKg}kg</span>}
                      {item.waistCm !== undefined && <span>腰围 {item.waistCm}cm</span>}
                      {item.chestCm !== undefined && <span>胸围 {item.chestCm}cm</span>}
                      {item.armCm !== undefined && <span>臂围 {item.armCm}cm</span>}
                      {item.thighCm !== undefined && <span>腿围 {item.thighCm}cm</span>}
                    </span>
                  </button>
                  <button
                    className="icon-button icon-button--small"
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    aria-label="删除这条身体数据"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              ))
            )}
          </section>
        </>
      )}

      <BodyMetricSheet
        open={bodySheetOpen}
        onClose={() => {
          setBodySheetOpen(false);
          setEditingMetric(null);
        }}
        initial={editingMetric}
        onSave={(metric) => {
          upsertBodyMetric(metric);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除这条身体数据？"
        message="删除后趋势图会相应更新。"
        confirmLabel="删除"
        danger
        onConfirm={() => {
          if (deleteTarget) deleteBodyMetric(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
