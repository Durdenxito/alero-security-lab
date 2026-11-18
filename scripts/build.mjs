import { mkdir, cp, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
const project = resolve(import.meta.dirname, '..');
if (process.cwd() !== project) throw new Error('Ejecuta el build desde la raíz del proyecto.');
// El destino fijo está dentro del proyecto; ningún archivo de builds anteriores se publica.
await rm(resolve(project, 'dist'), { recursive: true, force: true });
await mkdir('dist', { recursive: true });
for (const path of ['index.html', 'assets', 'src']) await cp(path, `dist/${path}`, { recursive: true });
await writeFile('dist/.nojekyll', '');
console.log('Folio listo en dist/. Solo se incluyen los archivos de la aplicación.');
