import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.local.workoutlog',
  appName: '训练日志',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0e1116',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_workout',
      iconColor: '#c8f45c',
    },
  },
};

export default config;
