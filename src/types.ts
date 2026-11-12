export type ExerciseCategory = '胸' | '背' | '腿' | '肩' | '手臂' | '核心' | '其他';

export interface ExerciseDef {
  id: string;
  name: string;
  category: ExerciseCategory;
  custom?: boolean;
}

export interface PlanSetTarget {
  weightKg: number | null;
  reps: number;
  restSeconds: number;
}

export interface PlanExercise {
  id: string;
  name: string;
  category?: ExerciseCategory;
  sets: PlanSetTarget[];
  note?: string;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  exercises: PlanExercise[];
  note?: string;
  createdAt: number;
  updatedAt: number;
  lastUsedAt?: number;
  sample?: boolean;
}

export type SessionStatus = 'planned' | 'active' | 'completed';
export type SetStatus = 'pending' | 'done' | 'partial' | 'skipped';
export type ExerciseStatus = 'pending' | 'inProgress' | 'completed' | 'skipped';

export interface SessionSet {
  id: string;
  targetWeightKg: number | null;
  targetReps: number;
  restSeconds: number;
  actualWeightKg?: number | null;
  actualReps?: number;
  status: SetStatus;
  completedAt?: number;
  note?: string;
}

export interface SessionExercise {
  id: string;
  name: string;
  category?: ExerciseCategory;
  order: number;
  sets: SessionSet[];
  note?: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  planId?: string;
  planName: string;
  status: SessionStatus;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  exercises: SessionExercise[];
  note?: string;
}

export interface BodyMetric {
  id: string;
  date: string;
  weightKg?: number;
  waistCm?: number;
  chestCm?: number;
  armCm?: number;
  thighCm?: number;
  note?: string;
  createdAt: number;
}

export interface Settings {
  defaultRestSeconds: number;
  autoStartRest: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  notificationsEnabled: boolean;
}

export interface RestTimer {
  id: string;
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  setId: string;
  setNumber: number;
  totalSeconds: number;
  endsAt: number;
  nextLabel: string;
  notificationId: number;
  notificationScheduled: boolean;
}

export interface ToastState {
  id: number;
  message: string;
}

export interface SetRecordInput {
  status: Exclude<SetStatus, 'pending'>;
  actualWeightKg: number | null;
  actualReps: number;
  note?: string;
}

export interface ImportedData {
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
  bodyMetrics: BodyMetric[];
  customExercises: ExerciseDef[];
  settings?: Partial<Settings>;
}

export interface AppStore {
  plans: WorkoutPlan[];
  sessions: WorkoutSession[];
  bodyMetrics: BodyMetric[];
  settings: Settings;
  customExercises: ExerciseDef[];
  restTimer: RestTimer | null;
  toast: ToastState | null;

  savePlan: (plan: WorkoutPlan) => void;
  duplicatePlan: (planId: string) => void;
  deletePlan: (planId: string) => void;
  addCustomExercise: (name: string, category: ExerciseCategory) => ExerciseDef;
  updateSettings: (patch: Partial<Settings>) => void;
  upsertBodyMetric: (metric: BodyMetric) => void;
  deleteBodyMetric: (metricId: string) => void;

  createSessionFromPlan: (plan: WorkoutPlan, date: string, status: SessionStatus) => WorkoutSession;
  startSession: (sessionId: string) => void;
  updateSessionTargets: (sessionId: string, exercises: SessionExercise[]) => void;
  quickCompleteSet: (sessionId: string, exerciseId: string, setId: string) => void;
  saveSetRecord: (
    sessionId: string,
    exerciseId: string,
    setId: string,
    data: SetRecordInput,
  ) => void;
  addSet: (sessionId: string, exerciseId: string) => void;
  addExerciseToSession: (sessionId: string, exercise: ExerciseDef) => SessionExercise | null;
  skipRemainingSets: (sessionId: string, exerciseId: string) => void;
  updateExerciseNote: (sessionId: string, exerciseId: string, note: string) => void;
  updateSessionNote: (sessionId: string, note: string) => void;
  finishSession: (sessionId: string, note?: string) => void;
  deleteSession: (sessionId: string) => void;

  dismissRestTimer: () => void;
  adjustRestTimer: (deltaSeconds: number) => void;

  showToast: (message: string) => void;
  hideToast: () => void;
  resetAllData: () => void;
  importData: (data: ImportedData, mode: 'merge' | 'replace') => void;
  loadSampleData: () => void;
}
