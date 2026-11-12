import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { RestTimer, Settings } from '../types';

const CHANNELS = {
  both: 'rest-both',
  sound: 'rest-sound',
  vibrate: 'rest-vibrate',
  silent: 'rest-silent',
} as const;

let channelsReady = false;
let audioContext: AudioContext | null = null;

function channelFor(settings: Settings): string {
  if (settings.soundEnabled && settings.vibrationEnabled) return CHANNELS.both;
  if (settings.soundEnabled) return CHANNELS.sound;
  if (settings.vibrationEnabled) return CHANNELS.vibrate;
  return CHANNELS.silent;
}

export async function initNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform() || channelsReady) return;
  try {
    const create = (
      id: string,
      name: string,
      importance: 0 | 1 | 2 | 3 | 4 | 5,
      sound: string | undefined,
      vibration: boolean,
    ) =>
      LocalNotifications.createChannel({
        id,
        name,
        description: '组间休息结束提醒',
        importance,
        visibility: 1,
        sound,
        vibration,
      });
    await create(CHANNELS.both, '休息提醒 · 声音+震动', 4, 'rest.wav', true);
    await create(CHANNELS.sound, '休息提醒 · 仅声音', 4, 'rest.wav', false);
    await create(CHANNELS.vibrate, '休息提醒 · 仅震动', 4, undefined, true);
    await create(CHANNELS.silent, '休息提醒 · 静音', 3, undefined, false);
    channelsReady = true;
  } catch {
    // 通知渠道创建失败时静默降级为应用内提醒
  }
}

export async function ensureNotificationPermission(prompt = true): Promise<boolean> {
  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return true;
    if (!prompt) return false;
    const requested = await LocalNotifications.requestPermissions();
    return requested.display === 'granted';
  } catch {
    return false;
  }
}

export async function getNotificationPermission(): Promise<string> {
  try {
    const result = await LocalNotifications.checkPermissions();
    return result.display;
  } catch {
    return 'prompt';
  }
}

export async function scheduleRestNotification(
  timer: RestTimer,
  settings: Settings,
  promptPermission = true,
): Promise<boolean> {
  if (!settings.notificationsEnabled) return false;
  await initNotifications();
  const allowed = await ensureNotificationPermission(promptPermission);
  if (!allowed) return false;
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: timer.notificationId,
          title: '休息结束',
          body: timer.nextLabel,
          schedule: {
            at: new Date(timer.endsAt),
            allowWhileIdle: true,
          },
          channelId: channelFor(settings),
          sound: settings.soundEnabled ? 'rest.wav' : undefined,
          isExactNotification: false,
          foreground: true,
          extra: {
            sessionId: timer.sessionId,
            exerciseId: timer.exerciseId,
          },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelRestNotification(id: number): Promise<void> {
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch {
    // 忽略已触发或不存在通知
  }
}

export function primeAudio(): void {
  try {
    if (!audioContext) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      audioContext = new Ctor();
    }
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }
  } catch {
    audioContext = null;
  }
}

export function playAlert(settings: Settings): void {
  if (settings.soundEnabled) {
    primeAudio();
    try {
      if (audioContext) {
        const now = audioContext.currentTime;
        const notes = [
          { at: 0, frequency: 880 },
          { at: 0.18, frequency: 1174 },
        ];
        for (const note of notes) {
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = note.frequency;
          gain.gain.setValueAtTime(0.0001, now + note.at);
          gain.gain.exponentialRampToValueAtTime(0.22, now + note.at + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + note.at + 0.16);
          oscillator.connect(gain);
          gain.connect(audioContext.destination);
          oscillator.start(now + note.at);
          oscillator.stop(now + note.at + 0.18);
        }
      }
    } catch {
      // 忽略音频播放失败
    }
  }
  if (settings.vibrationEnabled && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate([160, 70, 160, 70, 240]);
    } catch {
      // 忽略震动失败
    }
  }
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}
