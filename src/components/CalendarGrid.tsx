import { useMemo } from 'react';
import type { WorkoutSession } from '../types';
import { WEEKDAY_LABELS, monthMatrix } from '../lib/date';
import { Icon } from './Icon';

interface CalendarGridProps {
  year: number;
  month: number;
  sessions: WorkoutSession[];
  onPick: (date: string) => void;
  animation?: 'left' | 'right' | null;
}

export function CalendarGrid({ year, month, sessions, onPick, animation }: CalendarGridProps) {
  const cells = useMemo(() => monthMatrix(year, month), [year, month]);
  const byDate = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    for (const session of sessions) {
      const list = map.get(session.date) ?? [];
      list.push(session);
      map.set(session.date, list);
    }
    return map;
  }, [sessions]);

  return (
    <div className="calendar">
      <div className="calendar-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className={`calendar-grid ${animation ? `calendar-grid--${animation}` : ''}`}>
        {cells.map((cell) => {
          const list = byDate.get(cell.date) ?? [];
          const active = list.find((session) => session.status === 'active');
          const planned = list.find((session) => session.status === 'planned');
          const completed = list
            .filter((session) => session.status === 'completed')
            .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0));
          const primary = active ?? planned ?? completed[0];
          const stateClass = active
            ? 'is-active'
            : planned
              ? 'is-planned'
              : completed.length
                ? 'is-done'
                : '';
          const label = primary?.planName ?? '';
          const aria = `${cell.date}${label ? `，${label}` : ''}${
            active ? '，训练中' : planned ? '，已安排' : completed.length ? '，已完成' : ''
          }`;
          return (
            <button
              key={cell.date}
              type="button"
              className={`cal-cell ${cell.inMonth ? '' : 'is-outside'} ${
                cell.isToday ? 'is-today' : ''
              } ${stateClass}`}
              onClick={() => onPick(cell.date)}
              aria-label={aria}
              title={aria}
            >
              <span className="cal-cell__day">{cell.day}</span>
              {primary ? (
                <span className="cal-cell__plan">
                  {completed.length > 0 && !active && !planned && (
                    <Icon name="check" size={9} strokeWidth={2.6} />
                  )}
                  {active && <span className="live-dot" />}
                  <span>{label}</span>
                </span>
              ) : cell.isToday ? (
                <span className="cal-cell__hint">安排</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
