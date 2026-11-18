import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

await mkdir('docs/images', { recursive: true });
await mkdir('artifacts/video', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:4180/');
await page.locator('.book-card').first().waitFor();
await page.screenshot({ path: 'docs/images/folio-desktop.png', fullPage: true });
await page.screenshot({ path: 'artifacts/video/01.png' });
await page.getByRole('button', { name: 'Registrar lectura' }).click();
await page.screenshot({ path: 'artifacts/video/02.png' });
await page.setViewportSize({ width: 390, height: 844 });
await page.goto('http://127.0.0.1:4180/');
await page.screenshot({ path: 'docs/images/folio-mobile.png', fullPage: true });
await page.setViewportSize({ width: 1440, height: 1000 });
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const before = JSON.parse(await readFile('docs/evidence/before.json', 'utf8'));
const after = JSON.parse(await readFile('docs/evidence/after.json', 'utf8'));
const slidePage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const pagesWorkflow = await readFile('.github/workflows/pages.yml', 'utf8');
const slides = [
  ['03', 'Un build que publica lo necesario', await readFile('scripts/build.mjs', 'utf8')],
  ['04', 'ZAP + Nuclei · resultados locales', `EXPERIMENTO CONTROLADO · 18 NOV 2026\n\n                                 CONTROL     FINAL\nExposición de .git/config         Sí          No\nCSP ausente (ZAP 10038)           Sí          No\nProtección contra framing        Ausente     Ausente\nGrupos de alertas ZAP             ${before.zap.alerts.length}          ${after.zap.alerts.length}\nCoincidencias Nuclei              ${before.nuclei.findings.length}          ${after.nuclei.findings.length}\nAlertas ZAP de riesgo alto        0           0\n\nControl: copia sin CSP y con metadatos de prueba.\nFinal: el artefacto dist/ real.\n\nPersisten avisos de cabeceras HTTP.\nNo equivalen a una certificación de seguridad.`],
  ['05', 'Pruebas de comportamiento y seguridad', `7 PRUEBAS DE LÓGICA Y EMPAQUETADO · APROBADAS\n\n• Estado y progreso de cada lectura\n• Validación de páginas y catálogos\n• Importación, exportación y propiedades permitidas\n• Búsqueda, filtros y estadísticas\n• Limpieza de archivos residuales en el build\n\n5 PRUEBAS DE NAVEGADOR · APROBADAS\n\n• Crear, guardar, terminar y eliminar\n• Búsqueda, filtros y estado vacío\n• Carga HTML importada representada como texto\n• Importación inválida conserva los datos\n• Móvil sin desbordamiento horizontal`],
  ['06', 'GitHub Pages · automatización preparada', pagesWorkflow.slice(pagesWorkflow.indexOf('  deploy:'))],
];
for (const [id, title, content] of slides) {
  const html = `<!doctype html><html lang="es"><meta charset="utf-8"><style>body{margin:0;padding:64px 78px;background:#eef2eb;color:#244d3d;font:22px Arial}small{letter-spacing:3px}h1{font:46px Georgia;margin:24px 0 38px}pre{white-space:pre-wrap;background:#fff;padding:34px;border-radius:16px;font:22px/1.6 Consolas,monospace;color:#26382d}footer{margin-top:28px;font-size:18px}</style><small>FOLIO / CONSTRUCCIÓN Y SEGURIDAD</small><h1>${title}</h1><pre>${escape(content)}</pre><footer>github.com/Durdenxito/folio-security-lab · Evidencias y código en el repositorio</footer></html>`;
  await writeFile(`artifacts/video/${id}.html`, html);
  await slidePage.setContent(html);
  await slidePage.screenshot({ path: `artifacts/video/${id}.png` });
}
await browser.close();
