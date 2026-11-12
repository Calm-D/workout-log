import { Capacitor, registerPlugin } from '@capacitor/core';

interface SafeAreaPlugin {
  getInsets(): Promise<{ top: number; bottom: number }>;
}

const SafeArea = registerPlugin<SafeAreaPlugin>('SafeArea');

export async function applySafeArea(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { top, bottom } = await SafeArea.getInsets();
    const root = document.documentElement;
    if (top > 0) {
      root.style.setProperty('--safe-top', `${top}px`);
    }
    if (bottom > 0) {
      root.style.setProperty('--safe-bottom', `${bottom}px`);
    }
  } catch {
    // 原生插件不可用时保留 CSS 里的兜底安全区
  }
}
