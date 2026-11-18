# Folio · Tu próxima página

Una biblioteca personal para organizar lecturas con una interfaz editorial. Añade libros, guarda notas, registra páginas y encuentra tu próxima historia.

![Biblioteca de Folio](docs/images/folio-desktop.png)

## La aplicación

- Crear, editar y eliminar libros con portadas tipográficas originales.
- Registrar progreso; el estado cambia automáticamente entre por leer, leyendo y terminado.
- Buscar títulos y autores sin distinguir tildes, filtrar y ordenar la biblioteca.
- Importar y exportar JSON con validación de formato y límites.
- Guardar los datos en este navegador mediante `localStorage`, sin cuentas ni servidor de datos.
- Usar la interfaz en escritorio o móvil, con navegación por teclado y diálogos nativos.

Los libros iniciales son ejemplos. No existe sincronización entre dispositivos: conserva una exportación si necesitas respaldar tu biblioteca. HTML, CSS y JavaScript nativo; fuentes Lora y Manrope incluidas con sus licencias OFL. No hay servicios externos durante el uso de la app.

## Ejecutar

Requisitos: Node.js 24 y npm. Docker con contenedores Linux para los escáneres.

```sh
npm ci
npm run dev
```

Abrir http://localhost:4173. El build genera `dist/` desde una lista de archivos permitidos y elimina residuos de compilaciones anteriores.

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run scan
npm run scan -- --compare
```

Las pruebas de navegador usan `/folio-security-lab/`, el mismo subdirectorio previsto para Pages. La comparación crea un empaquetado de control separado, sin CSP y con un `.git/config` de prueba sin credenciales. Nunca modifica el código fuente ni se publica ese control. Solo se analizan copias locales de esta aplicación.

## Automatización y Pages

Repositorio público: https://github.com/Durdenxito/folio-security-lab

`quality.yml` ejecuta pruebas y escáneres en cada push a `main` y pull request. Los reportes completos quedan como artefacto `folio-quality`. `pages.yml` hace las mismas comprobaciones y publica exclusivamente `dist/` mediante GitHub Actions, con el entorno `github-pages` y permisos de despliegue limitados a ese job.

El despliegue está preparado y su activación es manual:

1. En **Settings → Pages → Build and deployment**, seleccionar **GitHub Actions**.
2. En **Actions → Publicar Folio en GitHub Pages**, ejecutar **Run workflow** sobre `main`.
3. Consultar el enlace devuelto por el job `deploy` y verificar la aplicación publicada.

Dirección prevista tras el despliegue: `https://durdenxito.github.io/folio-security-lab/`. Todavía no se presenta como sitio publicado. Los pushes ejecutan calidad y no despliegan Pages.

La configuración sigue la [documentación oficial de GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Análisis de vulnerabilidades

Se usan **ZAP Baseline 2.17.0** y **Nuclei 3.11.1**, incluidos en el [listado de OWASP](https://community.owasp.org/Vulnerability_Scanning_Tools). ZAP inspecciona respuestas con reglas pasivas; Nuclei ejecuta tres plantillas oficiales versionadas: cabeceras, exposición de Git y listado de directorios. Las plantillas y su procedencia están en `security/nuclei/`.

La política bloquea errores de los escáneres, alertas altas de ZAP, hallazgos altos/críticos de Nuclei y cualquier exposición de `.git/config`. Conserva los avisos de otras severidades para revisión; aprobar el job no significa ausencia de vulnerabilidades. El argumento `-I` de ZAP permite revisar las advertencias con esta política explícita, sin ocultarlas.

Resultados locales y límites: [informe](docs/security-results.md). La CSP en HTML restringe recursos y conexiones, pero no reemplaza cabeceras HTTP. GitHub Pages no permite configurar cabeceras arbitrarias desde estos archivos. Los avisos de framing y cabeceras siguen documentados; no se agrega una directiva `frame-ancestors` ineficaz a un `<meta>`.

## Material del artículo y video

- [Artículo preparado para Dev.to](docs/article.md).
- [Guion del video, menor de cinco minutos](docs/video-script.md).
- [Resultados y evidencias reproducibles](docs/security-results.md).

La publicación del artículo, el video en una red social y el envío al grupo de Telegram requieren sus enlaces públicos finales. El material preparado no sustituye esas publicaciones.
