import type { ExerciseCategory, ExerciseDef } from '../types';

export const EXERCISE_CATEGORIES: ExerciseCategory[] = ['胸', '背', '腿', '肩', '手臂', '核心', '其他'];

export const BUILTIN_EXERCISES: ExerciseDef[] = [
  { id: 'bench-press', name: '卧推', category: '胸' },
  { id: 'incline-bench-press', name: '上斜卧推', category: '胸' },
  { id: 'decline-bench-press', name: '下斜卧推', category: '胸' },
  { id: 'dumbbell-bench-press', name: '哑铃卧推', category: '胸' },
  { id: 'dumbbell-fly', name: '哑铃飞鸟', category: '胸' },
  { id: 'cable-crossover', name: '绳索夹胸', category: '胸' },
  { id: 'push-up', name: '俯卧撑', category: '胸' },
  { id: 'dip', name: '双杠臂屈伸', category: '胸' },

  { id: 'pull-up', name: '引体向上', category: '背' },
  { id: 'lat-pulldown', name: '高位下拉', category: '背' },
  { id: 'barbell-row', name: '杠铃划船', category: '背' },
  { id: 'one-arm-row', name: '哑铃单臂划船', category: '背' },
  { id: 'seated-row', name: '坐姿绳索划船', category: '背' },
  { id: 'straight-arm-pulldown', name: '直臂下压', category: '背' },
  { id: 'deadlift', name: '硬拉', category: '背' },

  { id: 'squat', name: '深蹲', category: '腿' },
  { id: 'front-squat', name: '前蹲', category: '腿' },
  { id: 'leg-press', name: '腿举', category: '腿' },
  { id: 'leg-extension', name: '腿屈伸', category: '腿' },
  { id: 'leg-curl', name: '腿弯举', category: '腿' },
  { id: 'romanian-deadlift', name: '罗马尼亚硬拉', category: '腿' },
  { id: 'bulgarian-split-squat', name: '保加利亚分腿蹲', category: '腿' },
  { id: 'calf-raise', name: '提踵', category: '腿' },

  { id: 'shoulder-press', name: '肩推', category: '肩' },
  { id: 'lateral-raise', name: '哑铃侧平举', category: '肩' },
  { id: 'face-pull', name: '面拉', category: '肩' },
  { id: 'reverse-fly', name: '反向飞鸟', category: '肩' },
  { id: 'arnold-press', name: '阿诺德推举', category: '肩' },
  { id: 'shrug', name: '耸肩', category: '肩' },

  { id: 'barbell-curl', name: '杠铃弯举', category: '手臂' },
  { id: 'dumbbell-curl', name: '哑铃弯举', category: '手臂' },
  { id: 'hammer-curl', name: '锤式弯举', category: '手臂' },
  { id: 'triceps-pushdown', name: '绳索下压', category: '手臂' },
  { id: 'close-grip-bench', name: '窄距卧推', category: '手臂' },
  { id: 'skull-crusher', name: '仰卧臂屈伸', category: '手臂' },

  { id: 'crunch', name: '卷腹', category: '核心' },
  { id: 'hanging-leg-raise', name: '悬垂举腿', category: '核心' },
  { id: 'plank', name: '平板支撑', category: '核心' },
  { id: 'russian-twist', name: '俄罗斯转体', category: '核心' },
  { id: 'ab-wheel', name: '健腹轮', category: '核心' },
];

export function allExercises(customExercises: ExerciseDef[]): ExerciseDef[] {
  const names = new Set(BUILTIN_EXERCISES.map((item) => item.name));
  return [...BUILTIN_EXERCISES, ...customExercises.filter((item) => !names.has(item.name))];
}

export function searchExercises(
  exercises: ExerciseDef[],
  query: string,
  category?: ExerciseCategory,
): ExerciseDef[] {
  const keyword = query.trim().toLowerCase();
  return exercises.filter((item) => {
    if (category && item.category !== category) return false;
    if (!keyword) return true;
    return item.name.toLowerCase().includes(keyword);
  });
}
