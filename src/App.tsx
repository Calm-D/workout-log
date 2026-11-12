import { useEffect, useRef } from 'react';
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { CalendarPage } from './pages/CalendarPage';
import { DayPage } from './pages/DayPage';
import { PickPlanPage } from './pages/PickPlanPage';
import { ConfirmPlanPage } from './pages/ConfirmPlanPage';
import { WorkoutPage } from './pages/WorkoutPage';
import { ExercisePage } from './pages/ExercisePage';
import { PlansPage } from './pages/PlansPage';
import { PlanEditorPage } from './pages/PlanEditorPage';
import { TrendsPage } from './pages/TrendsPage';
import { SettingsPage } from './pages/SettingsPage';
import { TabBar } from './components/TabBar';
import { FloatingBars } from './components/FloatingBars';
import { Toast } from './components/Toast';
import { useAppStore } from './lib/store';
import { initNotifications, scheduleRestNotification } from './lib/notifications';

const TAB_PATHS = new Set(['/', '/plans', '/trends', '/settings']);

function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isTabPage = TAB_PATHS.has(location.pathname);
  const hasRestTimer = useAppStore((state) => Boolean(state.restTimer));
  const hasActiveSession = useAppStore((state) =>
    state.sessions.some((session) => session.status === 'active'),
  );
  const isWorkoutRoute = location.pathname.startsWith('/session/');
  const hasFloating = hasRestTimer || (hasActiveSession && !isWorkoutRoute);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = 0;
  }, [location.pathname]);

  useEffect(() => {
    void initNotifications();
    const state = useAppStore.getState();
    if (state.restTimer && state.restTimer.endsAt > Date.now()) {
      void scheduleRestNotification(state.restTimer, state.settings, false);
    }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void (async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: '#0e1116' });
        await StatusBar.setStyle({ style: Style.Light });
      } catch {
        // 状态栏设置失败时使用系统默认表现
      }
    })();
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let removeListener: (() => void) | undefined;
    void NativeApp.addListener('backButton', ({ canGoBack }) => {
      const hash = window.location.hash;
      if (hash && hash !== '#/') {
        if (canGoBack) {
          window.history.back();
        } else {
          window.location.hash = '#/';
        }
      } else {
        void NativeApp.exitApp();
      }
    })
      .then((listener) => {
        removeListener = () => {
          void listener.remove();
        };
      })
      .catch(() => {
        // Web 环境没有原生返回键
      });
    return () => removeListener?.();
  }, []);

  useEffect(() => {
    let disposed = false;
    let handle: { remove: () => Promise<void> } | undefined;
    void LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
      const extra = event.notification.extra as
        | { sessionId?: string; exerciseId?: string }
        | undefined;
      if (extra?.sessionId) {
        navigate(`/session/${extra.sessionId}`);
      }
    })
      .then((listener) => {
        if (disposed) {
          void listener.remove();
        } else {
          handle = listener;
        }
      })
      .catch(() => {
        // Web 或浏览器不支持通知操作时忽略
      });
    return () => {
      disposed = true;
      if (handle) void handle.remove();
    };
  }, [navigate]);

  return (
    <div className={`app-shell ${hasFloating ? 'has-floating' : ''}`}>
      <div className={`app-scroll ${isTabPage ? 'has-tabs' : ''}`} ref={scrollRef}>
        <div
          className={`page-shell ${isTabPage ? 'page-shell--tab' : 'page-shell--sub'}`}
          key={location.pathname}
        >
          <Routes location={location}>
            <Route path="/" element={<CalendarPage />} />
            <Route path="/day/:date" element={<DayPage />} />
            <Route path="/pick/:date" element={<PickPlanPage />} />
            <Route path="/confirm/plan/:planId/:date" element={<ConfirmPlanPage />} />
            <Route path="/confirm/session/:sessionId" element={<ConfirmPlanPage />} />
            <Route path="/session/:sessionId" element={<WorkoutPage />} />
            <Route path="/session/:sessionId/:exerciseId" element={<ExercisePage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/plans/new" element={<PlanEditorPage />} />
            <Route path="/plans/:planId/edit" element={<PlanEditorPage />} />
            <Route path="/trends" element={<TrendsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
      {isTabPage && <TabBar />}
      <FloatingBars tabOffset={isTabPage} />
      <Toast />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}
