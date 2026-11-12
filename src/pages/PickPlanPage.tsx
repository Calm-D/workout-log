import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppStore } from '../lib/store';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { dateLabel, isToday, todayStr } from '../lib/date';
import type { WorkoutPlan } from '../types';

function planMeta(plan: WorkoutPlan): string {
  const totalSets = plan.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  return `${plan.sample ? '示例 · ' : ''}${plan.exercises.length} 个动作 · ${totalSets} 组`;
}

export function PickPlanPage() {
  const navigate = useNavigate();
  const { date = todayStr() } = useParams();
  const plans = useAppStore((state) => state.plans);
  const sessions = useAppStore((state) => state.sessions);
  const loadSampleData = useAppStore((state) => state.loadSampleData);

  const active = sessions.find(
    (session) => session.date === date && session.status === 'active',
  );
  const planned = sessions.find(
    (session) => session.date === date && session.status === 'planned',
  );

  useEffect(() => {
    if (active) navigate(`/session/${active.id}`, { replace: true });
  }, [active, navigate]);

  const sorted = useMemo(
    () =>
      [...plans].sort(
        (a, b) =>
          (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0) || b.updatedAt - a.updatedAt,
      ),
    [plans],
  );

  return (
    <div className="page pick-page">
      <PageHeader
        onBack={() => navigate(`/day/${date}`)}
        title="选择训练方案"
        subtitle={dateLabel(date)}
        actions={
          <button
            className="icon-button"
            type="button"
            onClick={() => navigate(`/plans/new?date=${date}`)}
            aria-label="新建计划"
          >
            <Icon name="plus" size={22} />
          </button>
        }
      />

      {planned && (
        <div className="notice">
          <Icon name="alert" size={16} />
          <p>
            这一天已经安排了「{planned.planName}」。选择新方案并保存后，会替换原计划。
          </p>
        </div>
      )}

      {!plans.length ? (
        <EmptyState
          icon="dumbbell"
          title="还没有训练计划"
          description="先建一个计划，安排好动作、重量、次数和组间休息，下次直接选它开始。"
          action={
            <div className="button-column">
              <button
                className="btn btn--primary"
                type="button"
                onClick={() => navigate(`/plans/new?date=${date}`)}
              >
                新建计划
              </button>
              <button
                className="btn btn--ghost"
                type="button"
                onClick={loadSampleData}
              >
                载入示例计划看看
              </button>
            </div>
          }
        />
      ) : (
        <div className="plan-list">
          {sorted.map((plan) => (
            <button
              key={plan.id}
              className="plan-card"
              type="button"
              onClick={() => navigate(`/confirm/plan/${plan.id}/${date}`)}
            >
              <div className="plan-card__top">
                <div>
                  <h2>{plan.name}</h2>
                  <p>{planMeta(plan)}</p>
                </div>
                <span className="plan-card__chevron">
                  <Icon name="chevronRight" size={20} />
                </span>
              </div>
              <p className="plan-card__exercises">
                {plan.exercises.map((exercise) => exercise.name).join(' · ')}
              </p>
              <div className="plan-card__foot">
                <span>
                  {plan.lastUsedAt
                    ? `上次 ${dayjs(plan.lastUsedAt).format('M月D日')}`
                    : '还没练过'}
                </span>
                <span className="plan-card__pick">
                  {isToday(date) ? '选择并开始' : '安排到这天'}
                  <Icon name="chevronRight" size={14} />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
