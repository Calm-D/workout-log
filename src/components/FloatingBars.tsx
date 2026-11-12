import { useLocation } from 'react-router-dom';
import { useAppStore } from '../lib/store';
import { ActiveWorkoutBar } from './ActiveWorkoutBar';
import { RestTimerBar } from './RestTimerBar';

interface FloatingBarsProps {
  tabOffset: boolean;
}

export function FloatingBars({ tabOffset }: FloatingBarsProps) {
  const location = useLocation();
  const restTimer = useAppStore((state) => state.restTimer);
  const hasActive = useAppStore((state) =>
    state.sessions.some((session) => session.status === 'active'),
  );
  const onWorkoutPage = location.pathname.startsWith('/session/');
  const showActive = hasActive && !onWorkoutPage;

  if (!restTimer && !showActive) return null;

  return (
    <div className={`floating-stack ${tabOffset ? 'floating-stack--tabs' : ''}`}>
      <RestTimerBar />
      {showActive && <ActiveWorkoutBar />}
    </div>
  );
}
