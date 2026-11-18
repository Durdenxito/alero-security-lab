import { spawn } from 'node:child_process';
import { mkdir, cp, readFile, writeFile, chmod } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createHash } from 'node:crypto';

const ZAP = 'ghcr.io/zaproxy/zaproxy@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af';
const NUCLEI = 'projectdiscovery/nuclei:v3.11.1';
const compare = process.argv.includes('--compare');
const outIndex = process.argv.indexOf('--out');
const output = resolve(outIndex >= 0 ? process.argv[outIndex + 1] : 'artifacts/security');
const network = process.platform === 'linux' ? ['--network', 'host'] : [];
const hostname = process.platform === 'linux' ? '127.0.0.1' : 'host.docker.internal';

function run(args, logfile) {
  return new Promise((resolveResult, reject) => {
    const child = spawn('docker', args, { windowsHide: true });
    let log = '';
    child.stdout.on('data', data => { log += data; });
    child.stderr.on('data', data => { log += data; });
    child.on('error', reject);
    child.on('close', async code => {
      await writeFile(logfile, log);
      resolveResult(code);
    });
  });
}

async function scan(variant, port) {
  const report = join(output, variant);
  await mkdir(report, { recursive: true });
  await chmod(report, 0o777);
  let directory = 'dist';
  if (variant === 'before') {
    directory = join(output, 'before-site');
    await cp('dist', directory, { recursive: true });
    const index = await readFile(join(directory, 'index.html'), 'utf8');
    await writeFile(join(directory, 'index.html'), index.replace(/^.*<meta (?:http-equiv="Content-Security-Policy"|name="referrer").*\r?\n/gm, ''));
    await mkdir(join(directory, '.git'), { recursive: true });
    // Empaquetado de control: no contiene credenciales ni la configuración real de Git.
    await writeFile(join(directory, '.git/config'), '[core]\nrepositoryformatversion = 0\nbare = false\n');
  }
  const server = spawn(process.execPath, ['scripts/serve.mjs', '--directory', directory, '--port', String(port)], { env: { ...process.env, HOST: '0.0.0.0' }, windowsHide: true, stdio: 'ignore' });
  const containerNames = [`folio-zap-${variant}-${process.pid}`, `folio-nuclei-${variant}-${process.pid}`];
  const target = `http://${hostname}:${port}/`;
  try {
    let ready = false;
    for (let i = 0; i < 50; i++) {
      try { const response = await fetch(`http://127.0.0.1:${port}/`); if (response.ok) { ready = true; break; } } catch {}
      await delay(100);
    }
    if (!ready) throw new Error(`No se pudo iniciar el servidor de ${variant}.`);
    console.log(`Analizando ${variant}: ${target}`);
    const exitCodes = await Promise.all([
      run(['run', '--rm', '--name', containerNames[0], ...network, '-v', `${report}:/zap/wrk/:rw`, ZAP, 'zap-baseline.py', '-t', target, '-m', '1', '-I', '-J', 'zap.json', '-r', 'zap.html', '-w', 'zap.md'], join(report, 'zap.log')),
      run(['run', '--rm', '--name', containerNames[1], ...network, '-v', `${resolve('security/nuclei')}:/templates:ro`, '-v', `${report}:/reports:rw`, NUCLEI, '-u', target, '-t', '/templates', '-disable-update-check', '-no-interactsh', '-jsonl-export', '/reports/nuclei.jsonl', '-rate-limit', '5', '-silent'], join(report, 'nuclei.log')),
    ]);
    if (exitCodes[0] !== 0 || exitCodes[1] !== 0) throw new Error(`Falló un escáner (${exitCodes.join(', ')}). Consultar los logs.`);
    const zap = JSON.parse(await readFile(join(report, 'zap.json'), 'utf8'));
    const zapAlerts = (zap.site ?? []).flatMap(site => site.alerts ?? []);
    const text = await readFile(join(report, 'nuclei.jsonl'), 'utf8');
    const nuclei = text.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
    const summary = {
      variant, target, scannedAt: new Date().toISOString(),
      appSha256: createHash('sha256').update(await readFile(join(directory, 'index.html'))).digest('hex'),
      zap: { image: ZAP, version: zap['@version'], alerts: zapAlerts.map(alert => ({ id: alert.pluginid, name: alert.name, risk: Number(alert.riskcode), count: alert.count })) },
      nuclei: { image: NUCLEI, templates: JSON.parse(await readFile('security/nuclei/source.json', 'utf8')), findings: nuclei.map(item => ({ id: item['template-id'], matcher: item['matcher-name'], name: item.info.name, severity: item.info.severity, url: item['matched-at'] })) },
    };
    await writeFile(join(report, 'summary.json'), JSON.stringify(summary, null, 2));
    console.log(`${variant}: ${zapAlerts.length} alertas ZAP, ${nuclei.length} coincidencias Nuclei.`);
    if (variant === 'after' && (zapAlerts.some(alert => Number(alert.riskcode) >= 3) || nuclei.some(item => ['high', 'critical'].includes(item.info.severity) || item['template-id'] === 'git-config'))) throw new Error('El análisis final detectó un hallazgo que bloquea la entrega.');
  } finally {
    server.kill();
    // Los contenedores --rm se eliminan al terminar; no se escanean servicios externos.
  }
}

await mkdir(output, { recursive: true });
await Promise.all([...(compare ? [scan('before', 4181)] : []), scan('after', 4182)]);
