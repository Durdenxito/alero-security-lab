# Alero · banca personal de demostración

![Panel de Alero](docs/images/alero-desktop.png)

Alero permite consultar dos cuentas en soles, mover fondos entre ellas y registrar pagos a beneficiarios. Incluye búsqueda de movimientos, filtros de ingresos y salidas, descarga CSV, meta de ahorro y pausa de una tarjeta virtual.

Es una simulación educativa: el estado se guarda en este navegador. No tiene autenticación, servidor bancario ni conexión con entidades financieras; los datos y el dinero son de demostración. El estado local puede modificarse con las herramientas del navegador y no constituye un registro financiero confiable.

## Ejecutar

Node.js 24 y npm. Para ZAP y Nuclei también se necesita Docker con contenedores Linux.

```sh
npm ci
npm run dev
```

Abrir http://localhost:4173. No hay dependencias de ejecución ni recursos externos durante el uso. Las fuentes Manrope y Lora incluyen sus licencias OFL en `assets/fonts/`.

## Pruebas y escaneo

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run scan
npm run scan -- --compare
```

Las pruebas utilizan `node:test` y Playwright. No se incluyen MSTest, xUnit, NUnit ni Moq. Se verifican operaciones en céntimos enteros, conservación del total entre cuentas, fondos insuficientes, identificadores duplicados, validación del estado, exportación CSV, persistencia, XSS, fallo de almacenamiento y uso móvil.

`scripts/build.mjs` limpia `dist/` y copia solo HTML, recursos y módulos. ZAP Baseline 2.17.0 realiza un análisis pasivo; Nuclei 3.11.1 ejecuta tres plantillas oficiales versionadas en `security/nuclei/`. El control comparativo agrega un `.git/config` de prueba sin credenciales y retira la CSP en una copia separada. Nunca se publica esa copia ni se escanean servicios de terceros.

El pipeline bloquea errores de ejecución, alertas ZAP altas, Nuclei alto/crítico o exposición de Git. Las demás alertas se conservan para revisión. Aprobar no implica ausencia de vulnerabilidades. [Resultados y límites](docs/security-results.md).

## Automatización de GitHub Pages

El repositorio se mantiene en [Durdenxito/folio-security-lab](https://github.com/Durdenxito/folio-security-lab). La ruta histórica se conserva para mantener sus enlaces.

`quality.yml` ejecuta las pruebas y los escáneres en pushes a `main` y pull requests. El artefacto `alero-quality` conserva los reportes y las pruebas de navegador. `pages.yml` repite las verificaciones y publica solo `dist/`, con un job de despliegue separado y el entorno `github-pages`.

Para publicar: **Settings → Pages → GitHub Actions**, después **Actions → Publicar Alero en GitHub Pages → Run workflow**. Dirección prevista: `https://durdenxito.github.io/folio-security-lab/`. La publicación sigue siendo manual y no se ha ejecutado. Configuración basada en la [documentación oficial](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Artículo

[Alero: pruebas y escaneo de una aplicación bancaria](docs/article.md), preparado para Dev.to con introducción, propósito y herramientas, desarrollo y conclusiones. No se genera video para esta versión.
