import { chromium } from 'playwright-core';
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

const shot = async (name) => {
  await page.screenshot({ path: path.join(shotsDir, name) });
  console.log(`shot ${name}`);
};

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('link', { name: '日历' }).waitFor();
  await shot('01-calendar-empty.png');

  await page.getByRole('link', { name: '计划' }).click();
  await page.waitForTimeout(350);
  await page.getByRole('button', { name: '载入示例计划' }).click();
  await page.waitForTimeout(450);
  await shot('02-plans-samples.png');

  await page.getByRole('link', { name: '日历' }).click();
  await page.waitForTimeout(450);
  await shot('03-calendar-samples.png');

  await page.locator('.cal-cell.is-today').click();
  await page.waitForURL(/\/pick\//);
  await page.waitForTimeout(350);
  await shot('04-pick-plan.png');

  await page.getByRole('button', { name: /推A/ }).first().click();
  await page.waitForURL(/\/confirm\/plan\//);
  await page.waitForTimeout(350);
  await shot('05-confirm-plan.png');

  await page.getByRole('button', { name: '保存并开始训练' }).click();
  await page.waitForURL(/\/session\//, { timeout: 15000 });
  await page.waitForTimeout(600);
  await shot('06-workout.png');

  await page.locator('.workout-todo').first().click();
  await page.waitForTimeout(400);
  await shot('07-exercise.png');

  await page.locator('.set-check').first().click();
  await page.waitForTimeout(700);
  await shot('08-set-done-rest.png');

  await page.locator('.set-row').nth(1).locator('.set-main').click();
  await page.waitForTimeout(350);
  await page.locator('.sheet-panel').getByRole('button', { name: '未完成' }).click();
  const sheetInputs = page.locator('.sheet-panel .input-with-suffix input');
  await sheetInputs.nth(1).fill('6');
  await page.locator('.sheet-panel textarea').fill('肩膀有点紧，做到第 2 组没力了。');
  await page.waitForTimeout(250);
  await shot('09-set-editor.png');
  await page.getByRole('button', { name: '保存本组' }).click();
  await page.waitForTimeout(500);
  await shot('10-exercise-partial.png');

  await page.locator('.page-header__back').click();
  await page.waitForTimeout(350);
  await shot('11-workout-progress.png');

  await page.getByRole('button', { name: '结束', exact: true }).click();
  await page.waitForTimeout(350);
  await shot('12-finish-sheet.png');
  await page.getByRole('button', { name: '确认结束' }).click();
  await page.waitForURL(/\/day\//, { timeout: 10000 });
  await page.waitForTimeout(450);
  await shot('13-today-record.png');

  await page.locator('.page-header__back').click();
  await page.waitForTimeout(400);
  await page.locator('.cal-cell.is-done').first().click();
  await page.waitForURL(/\/day\//);
  await page.waitForTimeout(400);
  await shot('14-past-record.png');

  await page.locator('.page-header__back').click();
  await page.waitForTimeout(300);
  await page.getByRole('link', { name: '趋势' }).click();
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: '动作', exact: true }).click();
  await page.waitForTimeout(400);
  await shot('15-trends-exercise.png');
  await page.getByRole('button', { name: '身体', exact: true }).click();
  await page.waitForTimeout(400);
  await shot('16-trends-body.png');

  await page.getByRole('link', { name: '我的' }).click();
  await page.waitForTimeout(400);
  await shot('17-settings.png');

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('link', { name: '日历' }).click();
  await page.waitForTimeout(400);
  await shot('18-desktop-calendar.png');

  console.log('errors:', errors.length ? errors : 'none');
} catch (error) {
  console.error('VISUAL CHECK FAILED:', error);
  await page.screenshot({ path: path.join(shotsDir, 'failure.png') }).catch(() => {});
  console.log('errors:', errors.length ? errors : 'none');
  process.exitCode = 1;
} finally {
  await browser.close();
}
