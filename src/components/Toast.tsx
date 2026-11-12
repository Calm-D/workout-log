import { useEffect } from 'react';
import { useAppStore } from '../lib/store';

export function Toast() {
  const toast = useAppStore((state) => state.toast);
  const hideToast = useAppStore((state) => state.hideToast);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      if (useAppStore.getState().toast?.id === toast.id) hideToast();
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [toast, hideToast]);

  if (!toast) return null;
  return (
    <div className="toast" role="status" key={toast.id}>
      {toast.message}
    </div>
  );
}
