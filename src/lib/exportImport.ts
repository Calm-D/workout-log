import dayjs from 'dayjs';
import type {
  BodyMetric,
  ImportedData,
  WorkoutPlan,
  WorkoutSession,
} from '../types';

export const EXPORT_VERSION = 1;

export interface ExportBundle extends ImportedData {
  app: 'workout-log';
  version: number;
  exportedAt: string;
}

export function buildExportBundle(data: ImportedData): ExportBundle {
  return {
    app: 'workout-log',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    plans: data.plans,
    sessions: data.sessions,
    bodyMetrics: data.bodyMetrics,
    customExercises: data.customExercises,
    settings: data.settings,
  };
}

export function exportFileName(): string {
  return `workout-log-backup-${dayjs().format('YYYYMMDD-HHmm')}.json`;
}

type ParseResult =
  | { ok: true; data: ImportedData }
  | { ok: false; error: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validPlan(value: unknown): value is WorkoutPlan {
  if (!isObject(value)) return false;
  if (!isString(value.id) || !isString(value.name)) return false;
  if (!Array.isArray(value.exercises)) return false;
  return value.exercises.every((exercise) => {
    if (!isObject(exercise)) return false;
    if (!isString(exercise.id) || !isString(exercise.name)) return false;
    if (!Array.isArray(exercise.sets) || exercise.sets.length === 0) return false;
    return exercise.sets.every(
      (set) =>
        isObject(set) &&
        (set.weightKg === null || isNumber(set.weightKg)) &&
        isNumber(set.reps) &&
        isNumber(set.restSeconds),
    );
  });
}

function validSession(value: unknown): value is WorkoutSession {
  if (!isObject(value)) return false;
  if (!isString(value.id) || !isString(value.date) || !isString(value.planName)) return false;
  if (!['planned', 'active', 'completed'].includes(String(value.status))) return false;
  if (!Array.isArray(value.exercises)) return false;
  return value.exercises.every((exercise) => {
    if (!isObject(exercise)) return false;
    if (!isString(exercise.id) || !isString(exercise.name)) return false;
    if (!isNumber(exercise.order)) return false;
    if (!Array.isArray(exercise.sets)) return false;
    return exercise.sets.every(
      (set) =>
        isObject(set) &&
        isString(set.id) &&
        (set.targetWeightKg === null || isNumber(set.targetWeightKg)) &&
        isNumber(set.targetReps) &&
        isNumber(set.restSeconds) &&
        ['pending', 'done', 'partial', 'skipped'].includes(String(set.status)),
    );
  });
}

function validBodyMetric(value: unknown): value is BodyMetric {
  if (!isObject(value)) return false;
  if (!isString(value.id) || !isString(value.date)) return false;
  return true;
}

export function parseImportBundle(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: '文件不是有效的 JSON' };
  }
  if (!isObject(raw)) return { ok: false, error: '备份内容格式不正确' };
  if (isNumber(raw.version) && raw.version > EXPORT_VERSION) {
    return { ok: false, error: '备份由更新版本的 App 生成，无法导入' };
  }
  if (!Array.isArray(raw.plans) || !Array.isArray(raw.sessions) || !Array.isArray(raw.bodyMetrics)) {
    return { ok: false, error: '备份缺少计划、训练或身体数据' };
  }
  if (!raw.plans.every(validPlan)) return { ok: false, error: '计划数据格式不正确' };
  if (!raw.sessions.every(validSession)) return { ok: false, error: '训练数据格式不正确' };
  if (!raw.bodyMetrics.every(validBodyMetric)) {
    return { ok: false, error: '身体数据格式不正确' };
  }

  const customExercises = Array.isArray(raw.customExercises)
    ? raw.customExercises.filter(
        (item) =>
          isObject(item) &&
          isString(item.id) &&
          isString(item.name) &&
          isString(item.category),
      )
    : [];

  return {
    ok: true,
    data: {
      plans: raw.plans,
      sessions: raw.sessions,
      bodyMetrics: raw.bodyMetrics,
      customExercises: customExercises as ImportedData['customExercises'],
      settings: isObject(raw.settings) ? (raw.settings as ImportedData['settings']) : undefined,
    },
  };
}

export function mergeImportedData(current: ImportedData, imported: ImportedData): ImportedData {
  const mergeById = <T extends { id: string }>(existing: T[], incoming: T[]): T[] => {
    const map = new Map(existing.map((item) => [item.id, item]));
    for (const item of incoming) {
      if (!map.has(item.id)) map.set(item.id, item);
    }
    return [...map.values()];
  };
  return {
    plans: mergeById(current.plans, imported.plans),
    sessions: mergeById(current.sessions, imported.sessions),
    bodyMetrics: mergeById(current.bodyMetrics, imported.bodyMetrics),
    customExercises: mergeById(current.customExercises, imported.customExercises),
    settings: current.settings,
  };
}
