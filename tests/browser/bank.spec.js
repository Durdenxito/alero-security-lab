import { test, expect } from '@playwright/test';
const open = async page => { await page.goto('./'); await page.getByRole('button', { name: 'Hacer una transferencia' }).click(); };
async function fill(page, amount, concept = 'Ahorro de prueba', to = 'savings') {
  await page.locator('#to').selectOption(to); await page.getByLabel('Importe en soles').fill(amount); await page.getByLabel('Concepto', { exact: true }).fill(concept);
}
test('una transferencia se conserva al recargar y actualiza ambas cuentas', async ({ page }) => {
  await open(page); const total = await page.locator('#total-balance').textContent(); await fill(page, '100.25'); await page.getByRole('button', { name: 'Confirmar transferencia' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible(); await expect(page.locator('#goal-amount')).toContainText('4,600.25'); await expect(page.locator('#total-balance')).toHaveText(total);
  await page.reload(); await expect(page.locator('#transactions')).toContainText('Ahorro de prueba'); await expect(page.locator('#goal-amount')).toContainText('4,600.25');
});
test('un importe sin fondos no cambia saldos ni historial', async ({ page }) => {
  await open(page); const total = await page.locator('#total-balance').textContent(); await fill(page, '1000000'); await page.getByRole('button', { name: 'Confirmar transferencia' }).click();
  await expect(page.locator('#form-error')).toContainText('no alcanza'); await expect(page.locator('#total-balance')).toHaveText(total); await expect(page.locator('#transactions tr')).toHaveCount(5);
});
test('el concepto se trata como texto, incluso con HTML hostil', async ({ page }) => {
  await open(page); const concept = '<img src=x onerror="window.aleroXss=true">'; await fill(page, '1.00', concept, 'lucia'); await page.getByRole('button', { name: 'Confirmar transferencia' }).click();
  await expect(page.locator('#transactions')).toContainText(concept); await expect(page.locator('#transactions img')).toHaveCount(0); expect(await page.evaluate(() => window.aleroXss)).toBeUndefined();
});
test('fallar al guardar no registra el débito', async ({ page }) => {
  await open(page); await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('quota'); }; }); await fill(page, '50'); await page.getByRole('button', { name: 'Confirmar transferencia' }).click();
  await expect(page.locator('#form-error')).toContainText('No se pudo guardar'); await expect(page.locator('#transactions tr')).toHaveCount(5); await expect(page.locator('#goal-amount')).toContainText('4,500.00');
});
test('tarjeta, filtros y descarga funcionan', async ({ page }) => {
  await page.goto('./'); await page.getByRole('button', { name: 'Pausar tarjeta' }).click(); await page.reload(); await expect(page.locator('#card-state')).toHaveText('Tarjeta en pausa');
  await page.locator('#filter').selectOption('in'); await expect(page.locator('#transactions tr')).toHaveCount(1); await page.getByRole('searchbox').fill('inexistente'); await expect(page.locator('#empty')).toBeVisible();
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Descargar CSV' }).click(); expect((await download).suggestedFilename()).toBe('alero-daily.csv');
});
test('móvil sin desbordamiento y con formulario accesible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page); await expect(page.getByRole('dialog')).toBeVisible(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click(); await page.getByRole('button', { name: 'Ver Ahorro flexible' }).click(); await expect(page.locator('#transactions tr')).toHaveCount(1);
});
