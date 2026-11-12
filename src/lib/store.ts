import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppStore,
  ExerciseDef,
  ImportedData,
  RestTimer,
  SessionExercise,
  SessionSet,
  Settings,
  WorkoutPlan,
  WorkoutSession,
} from '../types';
import { uid, notificationId } from './id';
import { sessionFromPlan, nextActionLabel } from './plan';
import { mergeImportedData } from './exportImport';
import { createSampleData } from './seed';
import { primeAudio, cancelRestNotification, scheduleRestNotification } from './notifications';

const DEFAULT_SETTINGS: Settings = {
  defaultRestSeconds: 90,
  autoStartRest: true,
  soundEnabled: true,
  vibrationEnabled: true,
  notificationsEnabled: true,
};

function updateSessionInList(
  sessions: WorkoutSession[],
  sessionId: string,
  updater: (session: WorkoutSession) => WorkoutSession,
): WorkoutSession[] {
  return sessions.map((session) => (session.id === sessionId ? updater(session) : session));
}

function updateSetInSession(
  session: WorkoutSession,
  exerciseId: string,
  setId: string,
  updater: (set: SessionSet) => SessionSet,
): WorkoutSession {
  return {
    ...session,
    exercises: session.exercises.map((exercise) =>
      exercise.id === exerciseId
        ? {
            ...exercise,
            sets: exercise.sets.map((set) => (set.id === setId ? updater(set) : set)),
          }
        : exercise,
    ),
  };
}

function trimNote(note?: string): string | undefined {
  const value = note?.trim();
  return value ? value : undefined;
}

function cancelCurrentRest(get: () => AppStore, set: (partial: Partial<AppStore>) => void): void {
  const timer = get().restTimer;
  if (!timer) return;
  void cancelRestNotification(timer.notificationId);
  set({ restTimer: null });
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => {
      const startRestTimer = (
        updatedSession: WorkoutSession,
        exerciseId: string,
        setId: string,
      ): void => {
        const settings = get().settings;
        if (!settings.autoStartRest) return;
        const exercise = updatedSession.exercises.find((item) => item.id === exerciseId);
        const targetSet = exercise?.sets.find((item) => item.id === setId);
        if (!exercise || !targetSet || targetSet.restSeconds <= 0) return;
        cancelCurrentRest(get, set);
        const timer: RestTimer = {
          id: uid('rest'),
          sessionId: updatedSession.id,
          exerciseId,
          exerciseName: exercise.name,
          setId,
          setNumber: exercise.sets.findIndex((item) => item.id === setId) + 1,
          totalSeconds: targetSet.restSeconds,
          endsAt: Date.now() + targetSet.restSeconds * 1000,
          nextLabel: nextActionLabel(updatedSession, exerciseId, setId),
          notificationId: notificationId(),
          notificationScheduled: false,
        };
        set({ restTimer: timer });
        primeAudio();
        void (async () => {
          const scheduled = await scheduleRestNotification(timer, settings, false);
          set((state) =>
            state.restTimer?.id === timer.id
              ? { restTimer: { ...state.restTimer, notificationScheduled: scheduled } }
              : {},
          );
        })();
      };

      return {
        plans: [],
        sessions: [],
        bodyMetrics: [],
        settings: DEFAULT_SETTINGS,
        customExercises: [],
        restTimer: null,
        toast: null,

        savePlan: (plan) => {
          const now = Date.now();
          set((state) => {
            const exists = state.plans.some((item) => item.id === plan.id);
            const saved: WorkoutPlan = {
              ...plan,
              updatedAt: now,
              sample: false,
              createdAt: exists
                ? state.plans.find((item) => item.id === plan.id)?.createdAt ?? plan.createdAt
                : plan.createdAt || now,
            };
            return {
              plans: exists
                ? state.plans.map((item) => (item.id === saved.id ? saved : item))
                : [saved, ...state.plans],
            };
          });
        },

        duplicatePlan: (planId) => {
          const plan = get().plans.find((item) => item.id === planId);
          if (!plan) return;
          const now = Date.now();
          const copy: WorkoutPlan = {
            ...plan,
            id: uid('plan'),
            name: `${plan.name} 副本`,
            createdAt: now,
            updatedAt: now,
            lastUsedAt: undefined,
            sample: false,
            exercises: plan.exercises.map((exercise) => ({
              ...exercise,
              id: uid('pex'),
              sets: exercise.sets.map((target) => ({ ...target })),
            })),
          };
          set((state) => ({ plans: [copy, ...state.plans] }));
          get().showToast('已复制计划');
        },

        deletePlan: (planId) => {
          set((state) => ({
            plans: state.plans.filter((plan) => plan.id !== planId),
          }));
          get().showToast('计划已删除');
        },

        addCustomExercise: (name, category) => {
          const trimmed = name.trim();
          const existing = [...get().customExercises].find(
            (item) => item.name.toLowerCase() === trimmed.toLowerCase(),
          );
          if (existing) return existing;
          const exercise: ExerciseDef = {
            id: uid('exercise'),
            name: trimmed,
            category,
            custom: true,
          };
          set((state) => ({ customExercises: [...state.customExercises, exercise] }));
          return exercise;
        },

        updateSettings: (patch) => {
          set((state) => ({ settings: { ...state.settings, ...patch } }));
        },

        upsertBodyMetric: (metric) => {
          set((state) => {
            const exists = state.bodyMetrics.some((item) => item.id === metric.id);
            return {
              bodyMetrics: exists
                ? state.bodyMetrics.map((item) => (item.id === metric.id ? metric : item))
                : [metric, ...state.bodyMetrics],
            };
          });
        },

        deleteBodyMetric: (metricId) => {
          set((state) => ({
            bodyMetrics: state.bodyMetrics.filter((item) => item.id !== metricId),
          }));
          get().showToast('身体数据已删除');
        },

        createSessionFromPlan: (plan, date, status) => {
          const session = sessionFromPlan(plan, date, status);
          const now = Date.now();
          set((state) => ({
            sessions: [
              session,
              ...state.sessions.filter(
                (item) => !(item.date === date && item.status === 'planned'),
              ),
            ],
            plans:
              status === 'active'
                ? state.plans.map((item) =>
                    item.id === plan.id
                      ? { ...item, lastUsedAt: now, sample: false }
                      : item,
                  )
                : state.plans,
          }));
          return session;
        },

        startSession: (sessionId) => {
          const now = Date.now();
          set((state) => {
            const session = state.sessions.find((item) => item.id === sessionId);
            if (!session || session.status !== 'planned') return {};
            return {
              sessions: updateSessionInList(state.sessions, sessionId, (item) => ({
                ...item,
                status: 'active',
                startedAt: now,
              })),
              plans: session.planId
                ? state.plans.map((plan) =>
                    plan.id === session.planId
                      ? { ...plan, lastUsedAt: now, sample: false }
                      : plan,
                  )
                : state.plans,
            };
          });
        },

        updateSessionTargets: (sessionId, exercises) => {
          set((state) => ({
            sessions: updateSessionInList(state.sessions, sessionId, (session) =>
              session.status === 'planned'
                ? {
                    ...session,
                    exercises: exercises.map((exercise, index) => ({
                      ...exercise,
                      order: index,
                      sets: exercise.sets.map((target) => ({
                        id: uid('set'),
                        targetWeightKg: target.targetWeightKg,
                        targetReps: target.targetReps,
                        restSeconds: target.restSeconds,
                        status: 'pending',
                      })),
                    })),
                  }
                : session,
            ),
          }));
        },

        quickCompleteSet: (sessionId, exerciseId, setId) => {
          const session = get().sessions.find((item) => item.id === sessionId);
          if (!session || session.status !== 'active') return;
          const exercise = session.exercises.find((item) => item.id === exerciseId);
          const target = exercise?.sets.find((item) => item.id === setId);
          if (!exercise || !target || target.status !== 'pending') return;
          const now = Date.now();
          const updatedSession = updateSetInSession(session, exerciseId, setId, (set) => ({
            ...set,
            status: 'done',
            actualWeightKg: set.targetWeightKg,
            actualReps: set.targetReps,
            completedAt: now,
          }));
          set((state) => ({
            sessions: updateSessionInList(state.sessions, sessionId, () => updatedSession),
          }));
          startRestTimer(updatedSession, exerciseId, setId);
        },

        saveSetRecord: (sessionId, exerciseId, setId, data) => {
          const session = get().sessions.find((item) => item.id === sessionId);
          if (!session || session.status !== 'active') return;
          const exercise = session.exercises.find((item) => item.id === exerciseId);
          const target = exercise?.sets.find((item) => item.id === setId);
          if (!exercise || !target) return;
          const previousStatus = target.status;
          const now = Date.now();
          const updatedSession = updateSetInSession(session, exerciseId, setId, (set) => ({
            ...set,
            status: data.status,
            actualWeightKg: data.actualWeightKg,
            actualReps: data.actualReps,
            completedAt: now,
            note: trimNote(data.note),
          }));
          set((state) => ({
            sessions: updateSessionInList(state.sessions, sessionId, () => updatedSession),
          }));
          if (previousStatus === 'pending' && data.status !== 'skipped') {
            startRestTimer(updatedSession, exerciseId, setId);
          } else if (data.status === 'skipped') {
            const timer = get().restTimer;
            if (timer && timer.setId === setId) {
              void cancelRestNotification(timer.notificationId);
              set({ restTimer: null });
            }
          }
        },

        addSet: (sessionId, exerciseId) => {
          const session = get().sessions.find((item) => item.id === sessionId);
          if (!session || session.status !== 'active') return;
          set((state) => ({
            sessions: updateSessionInList(state.sessions, sessionId, (item) => ({
              ...item,
              exercises: item.exercises.map((exercise) => {
                if (exercise.id !== exerciseId) return exercise;
                const last = exercise.sets[exercise.sets.length - 1];
                return {
                  ...exercise,
                  sets: [
                    ...exercise.sets,
                    {
                      id: uid('set'),
                      targetWeightKg: last?.targetWeightKg ?? null,
                      targetReps: last?.targetReps ?? 10,
                      restSeconds: last?.restSeconds ?? state.settings.defaultRestSeconds,
                      status: 'pending',
                    },
                  ],
                };
              }),
            })),
          }));
        },

        addExerciseToSession: (sessionId, exerciseDef) => {
          const session = get().sessions.find((item) => item.id === sessionId);
          if (!session || session.status !== 'active') return null;
          const exercise: SessionExercise = {
            id: uid('ex'),
            name: exerciseDef.name,
            category: exerciseDef.category,
            order: session.exercises.length,
            sets: Array.from({ length: 3 }, () => ({
              id: uid('set'),
              targetWeightKg: null,
              targetReps: 10,
              restSeconds: get().settings.defaultRestSeconds,
              status: 'pending',
            })),
          };
          set((state) => ({
            sessions: updateSessionInList(state.sessions, sessionId, (item) => ({
              ...item,
              exercises: [...item.exercises, exercise],
            })),
          }));
          return exercise;
        },

        skipRemainingSets: (sessionId, exerciseId) => {
          const session = get().sessions.find((item) => item.id === sessionId);
          if (!session || session.status !== 'active') return;
          const updatedSession: WorkoutSession = {
            ...session,
            exercises: session.exercises.map((exercise) =>
              exercise.id === exerciseId
                ? {
                    ...exercise,
                    sets: exercise.sets.map((set) =>
                      set.status === 'pending' ? { ...set, status: 'skipped' } : set,
                    ),
                  }
                : exercise,
            ),
          };
          set((state) => ({
            sessions: updateSessionInList(state.sessions, sessionId, () => updatedSession),
          }));
          const timer = get().restTimer;
          if (timer && timer.exerciseId === exerciseId) {
            void cancelRestNotification(timer.notificationId);
            set({ restTimer: null });
          }
        },

        updateExerciseNote: (sessionId, exerciseId, note) => {
          set((state) => ({
            sessions: updateSessionInList(state.sessions, sessionId, (session) => ({
              ...session,
              exercises: session.exercises.map((exercise) =>
                exercise.id === exerciseId
                  ? { ...exercise, note: trimNote(note) }
                  : exercise,
              ),
            })),
          }));
        },

        updateSessionNote: (sessionId, note) => {
          set((state) => ({
            sessions: updateSessionInList(state.sessions, sessionId, (session) => ({
              ...session,
              note: trimNote(note),
            })),
          }));
        },

        finishSession: (sessionId, note) => {
          const current = get().sessions.find((item) => item.id === sessionId);
          if (!current) return;
          cancelCurrentRest(get, set);
          const now = Date.now();
          set((state) => ({
            sessions: updateSessionInList(state.sessions, sessionId, (session) => ({
              ...session,
              status: 'completed',
              endedAt: now,
              note: trimNote(note) ?? session.note,
              exercises: session.exercises.map((exercise) => ({
                ...exercise,
                sets: exercise.sets.map((set) =>
                  set.status === 'pending' ? { ...set, status: 'skipped' } : set,
                ),
              })),
            })),
            plans: current.planId
              ? state.plans.map((plan) =>
                  plan.id === current.planId ? { ...plan, sample: false } : plan,
                )
              : state.plans,
          }));
        },

        deleteSession: (sessionId) => {
          const timer = get().restTimer;
          if (timer && timer.sessionId === sessionId) {
            void cancelRestNotification(timer.notificationId);
          }
          set((state) => ({
            sessions: state.sessions.filter((session) => session.id !== sessionId),
            restTimer: timer?.sessionId === sessionId ? null : state.restTimer,
          }));
          get().showToast('训练记录已删除');
        },

        dismissRestTimer: () => {
          cancelCurrentRest(get, set);
        },

        adjustRestTimer: (deltaSeconds) => {
          const timer = get().restTimer;
          if (!timer) return;
          void cancelRestNotification(timer.notificationId);
          const totalSeconds = Math.max(5, timer.totalSeconds + deltaSeconds);
          const endsAt = Math.max(Date.now() + 1000, timer.endsAt + deltaSeconds * 1000);
          const nextTimer: RestTimer = {
            ...timer,
            id: uid('rest'),
            totalSeconds,
            endsAt,
            notificationId: notificationId(),
            notificationScheduled: false,
          };
          set({ restTimer: nextTimer });
          void (async () => {
            const scheduled = await scheduleRestNotification(
              nextTimer,
              get().settings,
              false,
            );
            set((state) =>
              state.restTimer?.id === nextTimer.id
                ? { restTimer: { ...state.restTimer, notificationScheduled: scheduled } }
                : {},
            );
          })();
        },

        showToast: (message) => {
          set({ toast: { id: Date.now() + Math.random(), message } });
        },

        hideToast: () => {
          set({ toast: null });
        },

        resetAllData: () => {
          cancelCurrentRest(get, set);
          set({
            plans: [],
            sessions: [],
            bodyMetrics: [],
            customExercises: [],
            settings: DEFAULT_SETTINGS,
            restTimer: null,
          });
          get().showToast('全部数据已清空');
        },

        importData: (data, mode) => {
          cancelCurrentRest(get, set);
          if (mode === 'replace') {
            set({
              plans: data.plans,
              sessions: data.sessions,
              bodyMetrics: data.bodyMetrics,
              customExercises: data.customExercises,
              settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
              restTimer: null,
            });
          } else {
            const current: ImportedData = {
              plans: get().plans,
              sessions: get().sessions,
              bodyMetrics: get().bodyMetrics,
              customExercises: get().customExercises,
              settings: get().settings,
            };
            const merged = mergeImportedData(current, data);
            set({
              plans: merged.plans,
              sessions: merged.sessions,
              bodyMetrics: merged.bodyMetrics,
              customExercises: merged.customExercises,
              restTimer: null,
            });
          }
          get().showToast(mode === 'replace' ? '备份已覆盖导入' : '备份已合并导入');
        },

        loadSampleData: () => {
          const sample = createSampleData();
          const current: ImportedData = {
            plans: get().plans,
            sessions: get().sessions,
            bodyMetrics: get().bodyMetrics,
            customExercises: get().customExercises,
            settings: get().settings,
          };
          const merged = mergeImportedData(current, sample);
          set({
            plans: merged.plans,
            sessions: merged.sessions,
            bodyMetrics: merged.bodyMetrics,
          });
          get().showToast('示例数据已载入');
        },
      };
    },
    {
      name: 'workout-log-data-v1',
      version: 1,
      partialize: (state) => ({
        plans: state.plans,
        sessions: state.sessions,
        bodyMetrics: state.bodyMetrics,
        settings: state.settings,
        customExercises: state.customExercises,
        restTimer: state.restTimer,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<AppStore>;
        return {
          ...current,
          ...saved,
          settings: { ...DEFAULT_SETTINGS, ...(saved.settings ?? {}) },
          toast: null,
        };
      },
    },
  ),
);
