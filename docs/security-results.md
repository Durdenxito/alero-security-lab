# Revisión de seguridad de Alero

Fecha: 22 de noviembre de 2026. Alcance: la app bancaria de demostración servida localmente; no es una evaluación de una entidad financiera ni del futuro alojamiento público.

## Ejecución y evidencias

```sh
npm test
npm run test:e2e
npm run build
npm run scan -- --compare
```

Siete pruebas de lógica y empaquetado y seis pruebas de navegador aprobadas. Incluyen céntimos exactos, conservación del total, pagos externos, fondos insuficientes, destinos inválidos, duplicados, validación del historial, protección de fórmulas CSV, persistencia, XSS, error de almacenamiento, tarjeta, filtros, descarga y móvil.

ZAP Baseline 2.17.0 utiliza una imagen fijada por digest y un spider de un minuto con reglas pasivas. Nuclei 3.11.1 usa las tres plantillas oficiales del commit `5aec5a903cba140f9785d8af1dbab017f43a5b0c`: cabeceras, Git expuesto y directorios. Los objetivos son servidores temporales propios.

El **control** es una copia sin las etiquetas CSP/referrer y con un `.git/config` mínimo sin credenciales. El **final** es el build real. El control solo comprueba la detección de un caso conocido; no es un incidente observado en producción. [Resumen del control](evidence/before.json) y [resumen final](evidence/after.json).

## Interpretación

| Resultado local | Control | Final |
| --- | --- | --- |
| Grupos de alertas ZAP | 9 | 9 |
| Alertas ZAP altas | 0 | 0 |
| Coincidencias Nuclei | 10 | 9 |
| Exposición de Git | Sí, media | No |
| CSP ausente, ZAP 10038 | Sí | No |
| CSP directiva sin fallback, ZAP 10055 | No | Sí |

Las nueve coincidencias Nuclei finales son informativas y se refieren a cabeceras. El cambio entre 10038 y 10055 explica que el número de grupos ZAP no disminuya.

Nuclei detecta el archivo de Git en el control y no en el paquete final. ZAP reconoce la CSP del HTML final. Persisten advertencias de framing, políticas de cabeceras y respuestas auxiliares. Nuclei verifica la cabecera CSP, por lo que su aviso puede continuar aunque exista una política en HTML.

`frame-ancestors` requiere una cabecera HTTP; agregarla en `<meta>` no soluciona el framing. El aviso HSTS corresponde al servidor HTTP local. Los reportes no describen las cabeceras HTTPS de un despliegue de Pages todavía no ejecutado.

Los informes completos se generan en `artifacts/security/` por defecto y se conservan como artefactos `alero-quality` en Actions. El campo `appSha256` del resumen identifica el HTML, no todo el paquete.

## Política y límites

La automatización bloquea errores de ejecución, ZAP de riesgo alto, Nuclei alto/crítico y cualquier exposición de Git. Los demás avisos permanecen visibles para revisión. No se modifican las reglas ni los hallazgos para obtener una aprobación.

El baseline tradicional no explora todos los estados JavaScript. Playwright cubre operaciones concretas y Nuclei solo ejecuta tres plantillas. El estado en `localStorage` es editable y no ofrece integridad bancaria. No se han evaluado autenticación, autorización entre usuarios ni un backend transaccional porque la demo no los implementa. La pausa de tarjeta es un estado visual persistido, no un bloqueo de operaciones bancarias reales.
