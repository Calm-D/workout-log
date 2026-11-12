export function formatWeight(weight: number | null | undefined): string {
  if (weight === null || weight === undefined || Number.isNaN(weight)) return '自重';
  const rounded = Math.round(weight * 100) / 100;
  return `${rounded}kg`;
}

export function formatReps(reps: number | null | undefined): string {
  if (reps === null || reps === undefined || Number.isNaN(reps)) return '—';
  return `${reps}次`;
}

export function formatRest(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest > 0 ? `${minutes}分${rest}秒` : `${minutes}分钟`;
}

export function formatVolume(volume: number): string {
  return `${new Intl.NumberFormat('zh-CN').format(Math.round(volume))}kg`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 1 }).format(value);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
