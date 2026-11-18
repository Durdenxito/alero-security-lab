import { test, expect } from '@playwright/test';
test('crear, guardar, terminar y eliminar un libro', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.book-card')).toHaveCount(6);
  await page.getByRole('button', { name: 'Añadir libro' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Título', { exact: true }).fill('El libro de prueba');
  await dialog.getByLabel('Autor o autora').fill('Ana Lectora');
  await dialog.getByLabel('Páginas totales').fill('120');
  await dialog.getByRole('button', { name: 'Guardar libro' }).click();
  await expect(page.locator('.book-card')).toHaveCount(7);
  await page.reload();
  await expect(page.locator('.book-card')).toHaveCount(7);
  await page.getByRole('button', { name: 'Abrir El libro de prueba', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Página actual').fill('120');
  await page.getByRole('button', { name: 'Guardar progreso', exact: true }).click();
  const card = page.locator('.book-card').filter({ hasText: 'El libro de prueba' });
  await expect(card.locator('.status')).toHaveText('Terminado');
  await page.getByRole('button', { name: 'Editar El libro de prueba', exact: true }).click();
  await page.getByRole('button', { name: 'Eliminar libro', exact: true }).click();
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page.locator('.book-card')).toHaveCount(6);
});
test('buscar, filtrar y mostrar el estado vacío', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('searchbox').fill('cortazar');
  await expect(page.locator('.book-card')).toHaveCount(1);
  await page.getByRole('searchbox').fill('ningun-libro');
  await expect(page.getByText('No encontramos esos libros.')).toBeVisible();
  await page.getByRole('button', { name: 'Mostrar todos los libros' }).click();
  await page.getByRole('button', { name: 'Leyendo 2', exact: true }).click();
  await expect(page.locator('.book-card')).toHaveCount(2);
});
test('los datos importados se muestran como texto y no ejecutan HTML', async ({ page }) => {
  await page.goto('./');
  const attack = '<img src=x onerror="window.folioXss=true">';
  const book = { id: 'xss-test', title: attack, author: 'Autor', pages: 100, currentPage: 0, genre: 'Narrativa', palette: 'fern', notes: '<script>alert(1)</script>', createdAt: Date.now() };
  await page.locator('#import-file').setInputFiles({ name: 'prueba.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, books: [book] })) });
  await expect(page.locator('.book-card h3').filter({ hasText: attack })).toHaveCount(1);
  expect(await page.evaluate(() => window.folioXss)).toBeUndefined();
  await expect(page.locator('#book-grid img')).toHaveCount(0);
});
test('un archivo inválido conserva la biblioteca', async ({ page }) => {
  await page.goto('./');
  await page.locator('#import-file').setInputFiles({ name: 'incorrecto.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1,"books":[{"title":"no válido"}]}') });
  await expect(page.locator('.book-card')).toHaveCount(6);
  await expect(page.locator('#toast')).toBeVisible();
});
test('la app funciona en móvil sin desbordamiento horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Una página más.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Añadir libro' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
