import { chromium } from 'playwright-core';
import dayjs from 'dayjs';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = 'http://127.0.0.1:8014';
const shotsDir = path.resolve('shots');
fs.mkdirSync(shotsDir, { recursive: true });

const edgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ executablePath: edgePath, headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'zh-CN',
});
await context.grantPermissions(['notifications'], { origin: baseUrl });
const page = await context.newPage();
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

const check = (condition, label) => {
  if (!condition) throw new Error(`CHECK FAILED: ${label}`);
  console.log(`OK ${label}`);
};
const shot = async (name) => {
  await page.screenshot({ path: path.join(shotsDir, name) });
  console.log(`shot ${name}`);
};

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: '日历' }).waitFor();

  await page.locator('.cal-cell.is-today').click();
  await page.waitForURL(/\/pick\//);
  await page.locator('.btn.btn--primary').filter({ hasText: '新建计划' }).first().click();
  await page.waitForURL(/\/plans\/new/);
  await page.locator('.editor-summary input').first().fill('测试推');
  await page.getByRole('button', { name: '添加动作' }).click();
  await page.locator('.exercise-row').filter({ hasText: '卧推' }).first().click();
  await page.waitForTimeout(250);
  await check((await page.locator('.editor-set-row').count()) === 3, 'default 3 sets');
  await page.getByRole('button', { name: '统一设置', exact: true }).click();
  const planSheetInputs = page.locator('.sheet-panel .input-with-suffix input');
  await planSheetInputs.nth(0).fill('60');
  await planSheetInputs.nth(1).fill('8');
  await planSheetInputs.nth(2).fill('120');
  await page.getByRole('button', { name: '应用到全部组' }).click();
  await page.waitForTimeout(300);
  check(
    (await page.locator('.editor-set-row .mini-input input').nth(2).inputValue()) === '120',
    'bulk plan values applied',
  );
  await shot('f00-plan-editor.png');
  await page.getByRole('button', { name: '保存计划' }).click();
  await page.waitForURL(/\/confirm\/plan\//);
  await page.waitForTimeout(300);
  await check(await page.getByText('确认今天的训练').isVisible(), 'confirm after create');
  await page.getByRole('button', { name: '统一修改' }).first().click();
  const confirmSheetInputs = page.locator('.sheet-panel .input-with-suffix input');
  await confirmSheetInputs.nth(2).fill('6');
  await page.getByRole('button', { name: '应用到全部组' }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: '保存并开始训练' }).click();
  await page.waitForURL(/\/session\//, { timeout: 15000 });
  await page.waitForTimeout(300);
  await check((await page.locator('.workout-todo').count()) === 1, 'session has one exercise');

  await page.locator('.workout-todo').first().click();
  for (let index = 0; index < 3; index += 1) {
    await page.locator('.set-check').nth(index).click();
    await page.waitForTimeout(180);
  }
  await page.waitForTimeout(300);
  check(await page.getByRole('heading', { name: '动作已完成' }).isVisible(), 'exercise auto complete');
  await shot('f01-auto-complete.png');

  await page.getByRole('button', { name: '返回动作列表' }).click();
  await page.waitForTimeout(300);
  await shot('f02-workout-complete.png');
  await page.waitForTimeout(6500);
  const ended = await page.locator('.rest-bar.is-ended').count();
  check(ended > 0, 'rest timer ends');
  await shot('f03-rest-ended.png');

  await page.getByRole('button', { name: '结束', exact: true }).click();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: '确认结束' }).click();
  await page.waitForURL(/\/day\//);
  await page.waitForTimeout(350);
  check(await page.locator('.record-card h2').first().isVisible(), 'record saved');
  await shot('f04-record.png');

  await page.locator('.page-header__back').click();
  await page.waitForTimeout(300);
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  await page.locator(`.cal-cell[aria-label^="${tomorrow}"]`).first().click();
  await page.waitForURL(/\/pick\//);
  await page.getByRole('button', { name: /测试推/ }).first().click();
  await page.waitForURL(/\/confirm\/plan\//);
  await page.getByRole('button', { name: '保存到日历' }).click();
  await page.waitForURL(/\/day\//);
  await page.waitForTimeout(300);
  check((await page.locator('.status-pill--planned').count()) > 0, 'future plan saved');
  await shot('f05-future-plan.png');

  await page.locator('.page-header__back').click();
  await page.waitForTimeout(300);
  check(
    (await page.locator(`.cal-cell[aria-label*="${tomorrow}"][aria-label*="测试推"]`).count()) > 0,
    'calendar shows future plan',
  );

  await page.getByRole('link', { name: '趋势' }).click();
  await page.getByRole('button', { name: '身体', exact: true }).click();
  await page.getByRole('button', { name: '记录身体数据' }).click();
  await page
    .locator('.sheet-panel .input-with-suffix input')
    .first()
    .fill('77.2');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.waitForTimeout(350);
  check((await page.getByText('77.2kg').count()) > 0, 'body metric saved');
  await shot('f06-body.png');

  await page.getByRole('link', { name: '我的' }).click();
  await page.waitForTimeout(300);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /导出备份/ }).click();
  const download = await downloadPromise;
  const backupPath = path.resolve('tmp-backup.json');
  await download.saveAs(backupPath);
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  check(backup.app === 'workout-log' && backup.version === 1, 'export bundle');
  check(Array.isArray(backup.sessions) && backup.sessions.length >= 1, 'export sessions');

  await page.locator('input[type=file]').setInputFiles(backupPath);
  await page.waitForTimeout(350);
  check(
    await page.locator('.sheet-panel').getByRole('heading', { name: '导入备份' }).isVisible(),
    'import sheet opens',
  );
  await page.getByRole('button', { name: '合并导入' }).click();
  await page.waitForTimeout(350);
  check((await page.locator('.toast').count()) > 0, 'import toast');
  await shot('f07-settings.png');

  console.log('errors:', errors.length ? errors : 'none');
  if (errors.length) process.exitCode = 1;
} catch (error) {
  console.error('FUNCTIONAL CHECK FAILED:', error);
  await page.screenshot({ path: path.join(shotsDir, 'functional-failure.png') }).catch(() => {});
  console.log('errors:', errors.length ? errors : 'none');
  process.exitCode = 1;
} finally {
  await browser.close();
}
