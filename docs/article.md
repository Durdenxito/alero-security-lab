---
title: "Escanear una app antes de publicarla: Folio con ZAP, Nuclei y GitHub Actions"
published: false
description: "Una biblioteca personal, dos escáneres y un pipeline para revisar el artefacto que llegará a GitHub Pages."
tags: security, webdev, githubactions, testing
---

Una biblioteca personal parece una aplicación pequeña: registrar libros, buscar un autor y guardar el progreso. Sin embargo, incluso una web estática puede publicar archivos que no debería, interpretar datos importados como HTML o carecer de políticas del navegador. Construí **Folio** para explorar esos problemas y automatizar su revisión antes de publicar.

El [repositorio público de la aplicación](https://github.com/Durdenxito/folio-security-lab) incluye código, pruebas, plantillas de escaneo y el workflow de despliegue. El artículo acompaña una aplicación funcional; los informes permiten revisar qué se comprobó realmente.

![Interfaz de Folio](https://raw.githubusercontent.com/Durdenxito/folio-security-lab/main/docs/images/folio-desktop.png)

## Una aplicación pequeña con una superficie concreta

Folio organiza una biblioteca mediante tarjetas con portadas tipográficas. Permite añadir, editar y eliminar libros, registrar páginas, escribir notas, filtrar por estado e importar o exportar JSON. La interfaz se adapta al móvil y guarda datos en `localStorage`.

Elegí HTML, CSS y módulos JavaScript sin dependencias de ejecución. Las fuentes están incluidas en el proyecto y no se consulta ningún servicio externo durante el uso. Eso simplifica el despliegue estático, aunque implica que la biblioteca pertenece a ese navegador y necesita exportarse para respaldarla.

Los puntos de entrada más interesantes son el formulario y la importación de archivos. No existe una API ni una base de datos remota: sería incorrecto presentar una supuesta prueba de inyección SQL como evidencia relevante para esta arquitectura.

## Dos herramientas distintas para observar el mismo artefacto

La [lista de herramientas de OWASP](https://community.owasp.org/Vulnerability_Scanning_Tools) incluye ZAP y Nuclei. Su inclusión no constituye una recomendación o certificación de OWASP; la lista ayudó a escoger herramientas con funciones diferentes de los análisis de dependencias usados en los laboratorios.

Con **ZAP Baseline 2.17.0** ejecuté el spider durante un minuto y después el análisis pasivo de las respuestas. Según su [documentación](https://www.zaproxy.org/docs/docker/baseline-scan/), el baseline no realiza ataques activos. Produce reportes HTML, JSON y Markdown que el pipeline conserva como artefactos.

Con **Nuclei 3.11.1** ejecuté únicamente tres plantillas oficiales: cabeceras de seguridad, exposición de `.git/config` y listado de directorios. Están copiadas sin modificar desde un commit identificado de `nuclei-templates`, con su licencia y procedencia. El motor limita las solicitudes a cinco por segundo y desactiva Interactsh. La [documentación de Nuclei](https://docs.projectdiscovery.io/opensource/nuclei/running) explica la selección de plantillas y los formatos de salida; aquí se conserva JSONL.

```sh
npm ci
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run scan -- --compare
```

Los objetivos son dos servidores temporales de esta misma aplicación. No se analizan sitios de terceros.

## Un experimento de empaquetado que se puede repetir

Para comprobar que las herramientas detectan un problema conocido, el script crea un **control separado**: copia el build, retira la CSP del HTML y agrega un archivo `.git/config` mínimo sin credenciales. Esta variante no es una exposición descubierta en producción ni se publica. La otra variante sirve el `dist/` real.

Los resultados locales del 18 de noviembre de 2026 fueron:

| Observación | Control | Artefacto final |
| --- | --- | --- |
| Nuclei detecta `.git/config` | Sí, severidad media | No |
| ZAP avisa CSP ausente | Sí | No |
| ZAP avisa falta de protección contra framing | Sí | Sí |
| ZAP: grupos de alertas | 10 | 10 |
| Nuclei: coincidencias | 10 | 9 |
| Alertas altas de ZAP | 0 | 0 |

Los [resúmenes originales](https://github.com/Durdenxito/folio-security-lab/tree/main/docs/evidence) permiten contrastar estos números. No significa que desaparecieran todas las advertencias: ZAP sustituyó el aviso de CSP ausente por uno sobre una directiva sin fallback, relacionado con `frame-ancestors`. Nuclei sigue informando nueve cabeceras ausentes en el servidor HTTP local.

## Corregir y entender lo que queda

El build limpia `dist/` y copia una lista explícita: HTML, estilos, fuentes y módulos de la aplicación. Una prueba deja un `.git/config` residual y comprueba que el siguiente build lo elimina. Publicar el directorio del repositorio completo sería una decisión distinta y peligrosa.

Para la entrada de usuario, el código valida campos, cantidades de páginas, estados y tamaño del archivo. Al representar títulos o notas utiliza `textContent`. Una prueba real de navegador importa un título con un elemento `img` y un manejador `onerror`: se muestra literalmente, no aparece una imagen y el indicador de ejecución permanece sin definir.

La CSP del HTML permite scripts, estilos y fuentes del mismo origen y bloquea conexiones de red y objetos. Sin embargo, un `<meta>` no reemplaza una cabecera HTTP. No añadí una directiva `frame-ancestors` a ese elemento para aparentar una corrección: esa protección debe llegar en una cabecera. GitHub Pages tampoco permite establecer cabeceras arbitrarias mediante un archivo de configuración de la aplicación. Si esa protección es un requisito, conviene cambiar a un alojamiento que sí lo permita.

Otra diferencia importante: Nuclei comprueba la cabecera CSP; ZAP reconoce la política en HTML. Sus resultados no son contradictorios. El aviso HSTS describe el servidor HTTP de pruebas, no el HTTPS de un futuro despliegue público.

## Automatizar calidad y preparar el despliegue

`quality.yml` corre con cada push y pull request: instala, prueba lógica, construye, ejecuta Playwright y lanza ambos escáneres. El job falla si un escáner no termina correctamente, si ZAP encuentra severidad alta, si Nuclei encuentra severidad alta/crítica o si aparece exposición de Git. Las demás alertas se conservan para revisión; una marca verde no certifica una aplicación libre de vulnerabilidades.

El workflow `pages.yml` repite esas verificaciones antes de subir `dist/`. Después, un job separado usa `pages: write`, `id-token: write` y el entorno `github-pages`. Sigue la [configuración oficial de Pages con Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

El destino es el alojamiento público GitHub Pages. **En esta preparación el despliegue todavía no se ha ejecutado**: su activación manual está descrita en el README. La dirección prevista es `https://durdenxito.github.io/folio-security-lab/`; debe verificarse después de publicar antes de presentarla como una aplicación disponible.

## Qué demuestra esta revisión

El experimento muestra una detección reproducible de metadatos expuestos, una mejora de la política del navegador y pruebas de cómo se trata el contenido importado. También muestra límites: el spider tradicional no recorre todos los estados del JavaScript y tres plantillas no equivalen a un inventario completo de vulnerabilidades.

El siguiente paso operativo es activar Pages, revisar el sitio real y volver a evaluar sus respuestas. El video de demostración debe publicarse en una red social y enlazarse aquí antes de publicar este borrador; sus enlaces y el del artículo se compartirán en el grupo solicitado.
