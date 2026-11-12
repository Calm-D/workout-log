import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppStore } from '../lib/store';
import { PageHeader } from '../components/PageHeader';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';

export function PlansPage() {
  const navigate = useNavigate();
  const plans = useAppStore((state) => state.plans);
  const loadSampleData = useAppStore((state) => state.loadSampleData);

  const sorted = useMemo(
    () =>
      [...plans].sort(
        (a, b) =>
          (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0) || b.updatedAt - a.updatedAt,
      ),
    [plans],
  );

  return (
    <div className="page plans-page">
      <PageHeader
        title="训练计划"
        subtitle="提前排好动作与目标，训练时按计划推进"
        eyebrow="PLANS"
        actions={
          <button
            className="icon-button"
            type="button"
            onClick={() => navigate('/plans/new')}
            aria-label="新建计划"
          >
            <Icon name="plus" size={22} />
          </button>
        }
      />

      {!plans.length ? (
        <EmptyState
          icon="list"
          title="还没有训练计划"
          description="例如建一个「拉A」：引体向上、杠铃划船、面拉，把重量、次数和休息先设好。"
          action={
            <div className="button-column">
              <button
                className="btn btn--primary"
                type="button"
                onClick={() => navigate('/plans/new')}
              >
                新建计划
              </button>
              <button className="btn btn--ghost" type="button" onClick={loadSampleData}>
                载入示例计划
              </button>
            </div>
          }
        />
      ) : (
        <>
          <div className="plan-tip">
            <Icon name="calendar" size={16} />
            <p>在日历上点日期，就能把计划安排到那天；训练前还能临时调整重量和次数。</p>
          </div>
          <div className="plan-list">
            {sorted.map((plan) => {
              const totalSets = plan.exercises.reduce(
                (sum, exercise) => sum + exercise.sets.length,
                0,
              );
              return (
                <button
                  key={plan.id}
                  className="plan-card"
                  type="button"
                  onClick={() => navigate(`/plans/${plan.id}/edit`)}
                >
                  <div className="plan-card__top">
                    <div>
                      <h2>{plan.name}</h2>
                      <p>
                        {plan.sample ? '示例 · ' : ''}
                        {plan.exercises.length} 个动作 · {totalSets} 组
                      </p>
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
                        ? `上次训练 ${dayjs(plan.lastUsedAt).format('M月D日')}`
                        : '还没开始过'}
                    </span>
                    <span className="plan-card__pick">
                      编辑计划
                      <Icon name="chevronRight" size={14} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
