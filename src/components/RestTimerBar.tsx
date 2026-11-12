import { useEffect, useRef } from 'react';
import { useAppStore } from '../lib/store';
import { useNow } from '../lib/hooks';
import { formatRestCountdown } from '../lib/date';
import { playAlert } from '../lib/notifications';
import { Icon } from './Icon';

export function RestTimerBar() {
  const timer = useAppStore((state) => state.restTimer);
  const settings = useAppStore((state) => state.settings);
  const dismiss = useAppStore((state) => state.dismissRestTimer);
  const adjust = useAppStore((state) => state.adjustRestTimer);
  const now = useNow(Boolean(timer), 500);
  const alertRef = useRef<string | null>(null);

  useEffect(() => {
    if (!timer) return;
    const remaining = timer.endsAt - Date.now();
    if (
      remaining <= 0 &&
      alertRef.current !== timer.id &&
      Date.now() - timer.endsAt < 25_000 &&
      !timer.notificationScheduled
    ) {
      alertRef.current = timer.id;
      playAlert(settings);
    }
  }, [timer, settings]);

  if (!timer) return null;

  const remaining = Math.max(0, timer.endsAt - now);
  const ended = remaining <= 0;
  const totalMs = Math.max(1, timer.totalSeconds * 1000);
  const progress = Math.min(100, Math.max(0, (remaining / totalMs) * 100));

  return (
    <div className={`rest-bar ${ended ? 'is-ended' : ''}`} role="status" aria-live="polite">
      <div className="rest-bar__head">
        <div className="rest-bar__heading">
          <span className="rest-bar__icon">
            <Icon name="timer" size={22} />
          </span>
          <div className="rest-bar__labels">
            <strong className="rest-bar__eyebrow">
              {ended ? '休息结束' : '组间休息'}
            </strong>
            <span className="rest-bar__meta">
              {timer.exerciseName} · 第 {timer.setNumber} 组后
            </span>
          </div>
        </div>
        {!ended && (
          <strong className="rest-countdown">{formatRestCountdown(remaining)}</strong>
        )}
      </div>
      <p className="rest-bar__next">{timer.nextLabel}</p>
      <div className="rest-bar__footer">
        {!ended ? (
          <>
            <button
              className="rest-chip"
              type="button"
              onClick={() => adjust(-15)}
              aria-label="减少 15 秒"
            >
              -15s
            </button>
            <button
              className="rest-chip"
              type="button"
              onClick={() => adjust(15)}
              aria-label="增加 15 秒"
            >
              +15s
            </button>
            <button className="rest-skip" type="button" onClick={dismiss}>
              跳过休息
            </button>
          </>
        ) : (
          <button className="btn btn--primary rest-done-button" type="button" onClick={dismiss}>
            知道了
          </button>
        )}
      </div>
      {!ended && (
        <div className="rest-progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
