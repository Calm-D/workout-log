import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { useAppStore } from '../lib/store';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icon';
import { Toggle } from '../components/Toggle';
import { Sheet } from '../components/Sheet';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { buildExportBundle, exportFileName, parseImportBundle } from '../lib/exportImport';
import type { ImportedData } from '../types';
import {
  ensureNotificationPermission,
  getNotificationPermission,
} from '../lib/notifications';
import { formatBytes } from '../lib/format';

function permissionLabel(state: string): string {
  if (state === 'granted') return '已允许';
  if (state === 'denied') return '已拒绝';
  if (state === 'prompt' || state === 'prompt-with-rationale') return '未授权';
  return state || '未知';
}

export function SettingsPage() {
  const plans = useAppStore((state) => state.plans);
  const sessions = useAppStore((state) => state.sessions);
  const bodyMetrics = useAppStore((state) => state.bodyMetrics);
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const showToast = useAppStore((state) => state.showToast);
  const resetAllData = useAppStore((state) => state.resetAllData);
  const importData = useAppStore((state) => state.importData);
  const loadSampleData = useAppStore((state) => state.loadSampleData);

  const [permission, setPermission] = useState('prompt');
  const [importBundle, setImportBundle] = useState<ImportedData | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void getNotificationPermission().then(setPermission);
  }, []);

  const storageBytes = new Blob([
    localStorage.getItem('workout-log-data-v1') ?? '',
  ]).size;

  const requestPermission = async () => {
    const granted = await ensureNotificationPermission(true);
    const current = await getNotificationPermission();
    setPermission(current);
    showToast(granted ? '系统通知已开启' : '没有获得通知权限，锁屏提醒可能不可用');
  };

  const exportBackup = async () => {
    const bundle = buildExportBundle({
      plans,
      sessions,
      bodyMetrics,
      customExercises: useAppStore.getState().customExercises,
      settings,
    });
    const contents = JSON.stringify(bundle, null, 2);
    const fileName = exportFileName();

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: contents,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
        try {
          await Share.share({
            title: '训练日志备份',
            url: result.uri,
            dialogTitle: '保存或分享备份',
          });
        } catch {
          showToast(`备份已保存到 Documents：${fileName}`);
        }
      } catch {
        showToast('导出失败，请重试');
      }
      return;
    }

    const blob = new Blob([contents], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    showToast('备份已下载');
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseImportBundle(text);
      if (!parsed.ok) {
        showToast(parsed.error);
        return;
      }
      setImportBundle(parsed.data);
      setImportOpen(true);
    } catch {
      showToast('读取备份文件失败');
    }
  };

  return (
    <div className="page settings-page">
      <PageHeader
        title="我的"
        subtitle="设置、备份与数据"
        eyebrow="PROFILE"
      />

      <section className="profile-card">
        <div className="profile-card__logo">
          <Icon name="dumbbell" size={28} />
        </div>
        <div className="profile-card__main">
          <h2>训练日志</h2>
          <p>把每次训练都留下来</p>
        </div>
        <span className="profile-card__version">v1.0.1</span>
      </section>

      <div className="overview-strip">
        <div>
          <strong>{sessions.filter((session) => session.status === 'completed').length}</strong>
          <span>次训练</span>
        </div>
        <div>
          <strong>{plans.length}</strong>
          <span>个计划</span>
        </div>
        <div>
          <strong>{bodyMetrics.length}</strong>
          <span>条身体数据</span>
        </div>
      </div>

      <section className="settings-section">
        <h3>训练</h3>
        <div className="settings-card">
          <div className="settings-row settings-row--rest">
            <div className="settings-row__label">
              <span>默认组间休息</span>
              <small>新动作默认使用这个时长</small>
            </div>
            <div className="rest-value">
              <input
                type="number"
                min={5}
                max={900}
                value={settings.defaultRestSeconds}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (!Number.isFinite(value)) return;
                  updateSettings({
                    defaultRestSeconds: Math.min(900, Math.max(5, Math.round(value))),
                  });
                }}
                aria-label="默认组间休息秒数"
              />
              <span>秒</span>
            </div>
          </div>
          <div className="quick-rest">
            {[60, 90, 120, 180].map((seconds) => (
              <button
                key={seconds}
                className={`chip ${settings.defaultRestSeconds === seconds ? 'is-active' : ''}`}
                type="button"
                onClick={() => updateSettings({ defaultRestSeconds: seconds })}
              >
                {seconds}s
              </button>
            ))}
          </div>
          <div className="settings-row">
            <div className="settings-row__label">
              <span>完成一组自动休息</span>
              <small>点方框完成后立即开始倒计时</small>
            </div>
            <Toggle
              checked={settings.autoStartRest}
              onChange={(checked) => updateSettings({ autoStartRest: checked })}
              label="完成一组自动休息"
            />
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h3>提醒</h3>
        <div className="settings-card">
          <div className="settings-row">
            <div className="settings-row__label">
              <span>锁屏/后台提醒</span>
              <small>系统通知权限：{permissionLabel(permission)}</small>
            </div>
            <button className="text-button text-button--accent" type="button" onClick={requestPermission}>
              {permission === 'granted' ? '重新检查' : '去授权'}
            </button>
          </div>
          <div className="settings-row">
            <div className="settings-row__label">
              <span>使用系统通知</span>
              <small>休息结束提醒</small>
            </div>
            <Toggle
              checked={settings.notificationsEnabled}
              onChange={(checked) => {
                updateSettings({ notificationsEnabled: checked });
                if (checked) void requestPermission();
              }}
              label="使用系统通知"
            />
          </div>
          <div className="settings-row">
            <div className="settings-row__label">
              <span>声音</span>
              <small>应用内提示音和通知声音</small>
            </div>
            <Toggle
              checked={settings.soundEnabled}
              onChange={(checked) => updateSettings({ soundEnabled: checked })}
              label="声音"
            />
          </div>
          <div className="settings-row">
            <div className="settings-row__label">
              <span>震动</span>
              <small>休息结束时震动提醒</small>
            </div>
            <Toggle
              checked={settings.vibrationEnabled}
              onChange={(checked) => updateSettings({ vibrationEnabled: checked })}
              label="震动"
            />
          </div>
        </div>
        <p className="settings-note">
          安卓手机如果锁屏提醒不准时，请在系统设置中允许本应用自启动、关闭省电限制。通知声音和震动最终由系统通知渠道控制。
        </p>
      </section>

      <section className="settings-section">
        <h3>数据</h3>
        <div className="settings-card">
          <button className="settings-link" type="button" onClick={exportBackup}>
            <span className="settings-link__icon">
              <Icon name="download" size={18} />
            </span>
            <span className="settings-link__text">
              <strong>导出备份</strong>
              <small>JSON 文件，包含计划、训练和身体数据</small>
            </span>
            <Icon name="chevronRight" size={17} />
          </button>
          <button
            className="settings-link"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="settings-link__icon">
              <Icon name="upload" size={18} />
            </span>
            <span className="settings-link__text">
              <strong>导入备份</strong>
              <small>从之前导出的 JSON 恢复</small>
            </span>
            <Icon name="chevronRight" size={17} />
          </button>
          <button className="settings-link" type="button" onClick={() => setSampleOpen(true)}>
            <span className="settings-link__icon">
              <Icon name="sparkles" size={18} />
            </span>
            <span className="settings-link__text">
              <strong>载入示例数据</strong>
              <small>添加示例计划、记录和身体数据</small>
            </span>
            <Icon name="chevronRight" size={17} />
          </button>
          <button
            className="settings-link settings-link--danger"
            type="button"
            onClick={() => setClearOpen(true)}
          >
            <span className="settings-link__icon">
              <Icon name="trash" size={18} />
            </span>
            <span className="settings-link__text">
              <strong>清空所有数据</strong>
              <small>计划、训练和身体数据都会删除</small>
            </span>
            <Icon name="chevronRight" size={17} />
          </button>
        </div>
        <p className="settings-note">本地存储占用：{formatBytes(storageBytes)}。卸载 App 或清除数据会丢失记录，建议偶尔导出备份。</p>
      </section>

      <section className="settings-section">
        <h3>关于</h3>
        <div className="settings-card">
          <div className="settings-row">
            <div className="settings-row__label">
              <span>训练日志</span>
              <small>本地记录，不需要账号，不联网同步</small>
            </div>
            <span className="settings-version">v1.0.1</span>
          </div>
          <div className="settings-row">
            <div className="settings-row__label">
              <span>本地优先</span>
              <small>数据保存在本机，不联网同步；安装手机版后锁屏提醒更可靠</small>
            </div>
          </div>
        </div>
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void handleImportFile(file);
          event.target.value = '';
        }}
      />

      <Sheet
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          setImportBundle(null);
        }}
        title="导入备份"
        subtitle={
          importBundle
            ? `${importBundle.plans.length} 个计划 · ${importBundle.sessions.length} 条训练 · ${importBundle.bodyMetrics.length} 条身体数据`
            : undefined
        }
        footer={
          <div className="button-row">
            <button
              className="btn btn--ghost"
              type="button"
              onClick={() => {
                if (importBundle) importData(importBundle, 'merge');
                setImportOpen(false);
                setImportBundle(null);
              }}
            >
              合并导入
            </button>
            <button
              className="btn btn--primary"
              type="button"
              onClick={() => {
                if (importBundle) importData(importBundle, 'replace');
                setImportOpen(false);
                setImportBundle(null);
              }}
            >
              覆盖导入
            </button>
          </div>
        }
      >
        <div className="notice notice--soft">
          <Icon name="alert" size={16} />
          <p>
            合并导入会保留现有数据，只添加备份中不存在的记录；覆盖导入会先清空现有计划、训练和身体数据。
          </p>
        </div>
      </Sheet>

      <ConfirmDialog
        open={sampleOpen}
        title="载入示例数据？"
        message="会添加 3 个示例计划、几条历史训练和身体数据，不会删除你现有的内容。"
        confirmLabel="载入"
        onConfirm={() => {
          loadSampleData();
          setSampleOpen(false);
        }}
        onCancel={() => setSampleOpen(false)}
      />

      <ConfirmDialog
        open={clearOpen}
        title="清空所有数据？"
        message="计划、训练记录、身体数据和设置都会恢复为空，无法撤销。建议先导出备份。"
        confirmLabel="全部清空"
        danger
        onConfirm={() => {
          resetAllData();
          setClearOpen(false);
        }}
        onCancel={() => setClearOpen(false)}
      />
    </div>
  );
}
