import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../lib/store';
import { useElapsed } from '../lib/hooks';
import { formatClock } from '../lib/date';
import { Icon } from './Icon';

export function ActiveWorkoutBar() {
  const active = useAppStore((state) =>
    state.sessions.find((session) => session.status === 'active'),
  );
  const elapsed = useElapsed(active?.startedAt);
  const navigate = useNavigate();

  if (!active) return null;

  return (
    <button
      className="active-workout-bar"
      type="button"
      onClick={() => navigate(`/session/${active.id}`)}
    >
      <span className="live-dot" />
      <span className="active-workout-bar__title">训练中</span>
      <span className="active-workout-bar__plan">{active.planName}</span>
      <span className="active-workout-bar__time">{formatClock(elapsed)}</span>
      <Icon name="chevronRight" size={18} />
    </button>
  );
}
