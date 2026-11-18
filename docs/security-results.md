# Resultados del análisis

Ejecución local: 18 de noviembre de 2026. Objetivo: copia local de Folio servida por Node, no un despliegue público de GitHub Pages.

## Método

`npm run build` produce el artefacto final. `npm run scan -- --compare` analiza dos variantes con los mismos motores y plantillas:

1. **Control:** copia del artefacto sin las etiquetas CSP/referrer y con un archivo `.git/config` mínimo de prueba. Es un experimento de empaquetado inseguro, no una exposición observada en producción.
2. **Final:** contenido real de `dist/`, sin metadatos de Git y con la política CSP en HTML.

ZAP 2.17.0, imagen fijada por digest; spider de un minuto y reglas pasivas. Nuclei 3.11.1 con tres plantillas oficiales en el commit `5aec5a903cba140f9785d8af1dbab017f43a5b0c`, cinco peticiones por segundo, sin Interactsh. El objetivo siempre es un servidor temporal propio.

## Hallazgos

| Comprobación | Control | Final | Interpretación |
| --- | --- | --- | --- |
| Nuclei `git-config` | 1, medio | 0 | El paquete final excluye el archivo de control |
| ZAP CSP no definida, 10038 | Presente | Ausente | ZAP reconoce la política del HTML |
| ZAP CSP directiva sin fallback, 10055 | Ausente | Presente | Falta `frame-ancestors`, que exige cabecera HTTP |
| ZAP anti-clickjacking, 10020 | Presente | Presente | Falta protección HTTP contra framing |
| Alertas ZAP altas | 0 | 0 | Dentro del alcance pasivo ejecutado |
| Grupos de alertas ZAP | 10 | 10 | No se reducen a cero; cambia el tipo de advertencia CSP |
| Coincidencias Nuclei | 10 | 9 | En el final son nueve avisos informativos de cabeceras |

No hubo coincidencias de listado de directorios. Nuclei busca la cabecera CSP y continúa avisando aunque exista una política en `<meta>`: esas comprobaciones no son equivalentes. También informa HSTS ausente en este servidor HTTP local; no describe la configuración HTTPS futura de Pages.

Quedan avisos de Permissions-Policy, COOP/COEP/CORP, caché y algunas respuestas auxiliares sin Content-Type. La alerta informativa de atributos HTML potencialmente controlables no demuestra XSS; se complementa con una prueba de navegador que importa una carga HTML y comprueba que se representa como texto, sin ejecutar código.

## Evidencias

Los resúmenes originales están en [evidence/before.json](evidence/before.json) y [evidence/after.json](evidence/after.json). Los reportes ZAP completos HTML/JSON/Markdown y Nuclei JSONL se generan en `artifacts/security/` y se conservan en cada ejecución de Actions. El SHA-256 del HTML figura en los resúmenes y no representa un hash de todo el paquete.

## Correcciones y alcance restante

El build copia únicamente `index.html`, `assets/` y `src/`, y limpia el destino. Una prueba introduce un residuo `.git/config` y verifica que desaparezca. Los datos importados pasan por un esquema con límites y propiedades permitidas; la vista utiliza `textContent`. La CSP permite recursos locales y bloquea conexiones de red y objetos.

El baseline tradicional no recorre todos los estados del JavaScript; Playwright prueba las interacciones principales por separado. Tres plantillas de Nuclei tampoco representan un análisis completo de CVE. No se evaluaron autenticación, API, base de datos o secretos de servidor porque Folio no incluye esos componentes. Las alertas HTTP necesitan reevaluarse después del despliegue real; si se exige proteger contra framing mediante cabeceras personalizadas, debe escogerse un alojamiento que permita configurarlas.

Política de CI: falla ante errores de ejecución, ZAP alto, Nuclei alto/crítico o exposición de Git. Los avisos medios e informativos se reportan y requieren revisión. No se modifican reglas de los escáneres ni sus resultados para aprobar.
