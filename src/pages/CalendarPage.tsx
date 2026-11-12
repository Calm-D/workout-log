import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../lib/store';
import { CalendarGrid } from '../components/CalendarGrid';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';
import {
  addMonths,
  currentMonth,
  dateLabel,
  formatClock,
  formatDurationShort,
  monthLabel,
  todayStr,
} from '../lib/date';
import { useElapsed } from '../lib/hooks';
import { sessionStats } from '../lib/plan';

export function CalendarPage() {
  const navigate = useNavigate();
  const sessions = useAppStore((state) => state.sessions);
  const [view, setView] = useState(currentMonth);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const today = todayStr();

  const todaySessions = useMemo(
    () => sessions.filter((session) => session.date === today),
    [sessions, today],
  );
  const activeToday = todaySessions.find((session) => session.status === 'active');
  const plannedToday = todaySessions.find((session) => session.status === 'planned');
  const completedToday = todaySessions
    .filter((session) => session.status === 'completed')
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0));
  const elapsed = useElapsed(activeToday?.startedAt);
  const current = currentMonth();
  const isCurrentMonth = view.year === current.year && view.month === current.month;

  const shiftMonth = (delta: number) => {
    setDirection(delta > 0 ? 'left' : 'right');
    setView((prev) => addMonths(prev.year, prev.month, delta));
  };

  const goToday = () => {
    if (isCurrentMonth) return;
    const target = currentMonth();
    setDirection(
      target.year * 12 + target.month > view.year * 12 + view.month ? 'left' : 'right',
    );
    setView(target);
  };

  const handlePick = (date: string) => {
    const list = sessions.filter((session) => session.date === date);
    const active = list.find((session) => session.status === 'active');
    if (active) {
      navigate(`/session/${active.id}`);
      return;
    }
    if (list.length > 0) {
      navigate(`/day/${date}`);
      return;
    }
    if (date >= today) {
      navigate(`/pick/${date}`);
      return;
    }
    navigate(`/day/${date}`);
  };

  const completedStats = completedToday[0] ? sessionStats(completedToday[0]) : null;

  return (
    <div className="page calendar-page">
      <PageHeader
        title="训练日历"
        subtitle={dateLabel(today)}
        eyebrow="TRAINING LOG"
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

      <section className="today-strip">
        <div className="today-strip__main">
          <span className="today-strip__label">
            {activeToday ? (
              <>
                <span className="live-dot" />
                训练中
              </>
            ) : plannedToday ? (
              '今日计划'
            ) : completedToday[0] ? (
              '今天已完成'
            ) : (
              '今天'
            )}
          </span>
          <strong>
            {activeToday
              ? activeToday.planName
              : plannedToday
                ? plannedToday.planName
                : completedToday[0]
                  ? completedToday[0].planName
                  : '还没安排训练'}
          </strong>
          <span className="today-strip__meta">
            {activeToday
              ? formatClock(elapsed)
              : plannedToday
                ? `${plannedToday.exercises.length} 个动作`
                : completedStats
                  ? `用时 ${formatDurationShort(completedStats.durationMs)}`
                  : '选一个方案开始'}
          </span>
        </div>
        {activeToday ? (
          <button
            className="btn btn--primary btn--small"
            type="button"
            onClick={() => navigate(`/session/${activeToday.id}`)}
          >
            继续
          </button>
        ) : plannedToday ? (
          <button
            className="btn btn--primary btn--small"
            type="button"
            onClick={() => navigate(`/day/${today}`)}
          >
            查看计划
          </button>
        ) : completedToday[0] ? (
          <button
            className="btn btn--soft btn--small"
            type="button"
            onClick={() => navigate(`/day/${today}`)}
          >
            看记录
          </button>
        ) : (
          <button
            className="btn btn--primary btn--small"
            type="button"
            onClick={() => navigate(`/pick/${today}`)}
          >
            选方案
          </button>
        )}
      </section>

      <section className="calendar-shell">
        <div className="month-nav">
          <button
            className="icon-button"
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="上个月"
          >
            <Icon name="chevronLeft" size={20} />
          </button>
          <div className="month-nav__center">
            <strong>{monthLabel(view.year, view.month)}</strong>
            {!isCurrentMonth && (
              <button className="text-button" type="button" onClick={goToday}>
                回到今天
              </button>
            )}
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="下个月"
          >
            <Icon name="chevronRight" size={20} />
          </button>
        </div>
        <CalendarGrid
          key={`${view.year}-${view.month}`}
          year={view.year}
          month={view.month}
          sessions={sessions}
          onPick={handlePick}
          animation={direction}
        />
        <div className="calendar-legend">
          <span>
            <i className="legend-dot legend-dot--planned" />
            已安排
          </span>
          <span>
            <i className="legend-dot legend-dot--done" />
            已完成
          </span>
          <span>
            <i className="legend-dot legend-dot--active" />
            训练中
          </span>
        </div>
      </section>

    </div>
  );
}
