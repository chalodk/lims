# 07 — Reportes y PDFMonkey

> Última actualización: 2026-05-20.

## Proposito

Este documento describe el sistema de generacion de reportes PDF, la integracion con PDFMonkey, y el patron builder por tipo de analisis.

## Documentos relacionados

| Doc | Relacion |
|---|---|
| `03-api-routes.md` | Endpoints de reportes |
| `04-base-de-datos.md` | Tablas reports, report_templates, report_assets |
| `08-deploy-entorno.md` | Variables PDFMONKEY_API_KEY y templates |

## Arquitectura de reportes

```
Frontend                      API Routes                        PDFMonkey
────────                      ──────────                        ────────
CreateReportModal  ──POST──▶  /api/reports
                              │ 1. Crea row en reports
                              │ 2. Asocia resultados
                              │ 3. POST a PDFMonkey API
                              │    (template_id + payload)
                              │ 4. Actualiza status: 'generated'
                              ◀── PDFMonkey webhook
                                   (avisa cuando PDF esta listo)

Visualizar         ──GET───▶  /api/reports/view/[id]
                              │ Devuelve URL del PDF
Descargar          ──GET───▶  /api/reports/pdf/[filename]
                              │ Sirve el binario
```

## Flujo de generacion

```
1. Usuario selecciona resultados → CreateReportModal
2. POST /api/reports → crea report (status: 'draft')
3. El mismo endpoint:
   a. Resuelve el tipo de analisis (test_catalog.area → Registry)
   b. Selecciona el template PDFMonkey correcto
   c. Llama al builder correspondiente
   d. POST a PDFMonkey API con { template_id, payload }
   e. Actualiza report a status: 'generated'
4. PDFMonkey genera el PDF async
5. Webhook POST /api/reports/pdfmonkey notifica cuando esta listo
6. Usuario descarga desde /api/reports/pdf/[filename]
```

## Tipos de analisis y templates

Cada tipo de analisis tiene su propio template PDFMonkey. La logica de construccion de payload esta actualmente en `src/app/api/reports/pdfmonkey/route.ts` (~1400 lineas). Esta planificada la extraccion a builders separados.

| Tipo | Enum | Template Env Var |
|---|---|---|
| Virologia | `virology` | `PDFMONKEY_TEMPLATE_VIROLOGY` |
| Fitopatologia | `phytopatology` | `PDFMONKEY_TEMPLATE_PHYTOPATOLOGY` |
| Nematologia | `nematology` | `PDFMONKEY_TEMPLATE_NEMATOLOGY` |
| Bacteriologia | `bacteriology` | `PDFMONKEY_TEMPLATE_BACTERIOLOGY` |
| Deteccion precoz | `early_detection` | `PDFMONKEY_TEMPLATE_EARLY_DETECTION` |
| Default | `default` | `PDFMONKEY_TEMPLATE_DEFAULT` |

## Endpoints de reportes

| Metodo | Ruta | Proposito |
|---|---|---|
| POST | `/api/reports` | [NO IMPLEMENTADO] Crear reporte + disparar PDFMonkey |
| GET | `/api/reports` | [NO IMPLEMENTADO] Listar reportes |
| GET | `/api/reports/[sampleId]/render` | Renderizar preview de reporte |
| POST | `/api/reports/[sampleId]/render` | Generar PDF de reporte |
| GET | `/api/reports/view/[id]` | Vista previa de reporte |
| GET | `/api/reports/pdf/[filename]` | Descargar PDF |
| POST | `/api/reports/pdfmonkey` | Webhook de PDFMonkey (publico) |
| GET | `/api/reports/templates` | Listar templates |
| POST | `/api/reports/templates` | Crear template |
| PATCH | `/api/reports/status/[reportId]` | Actualizar estado |
| PATCH | `/api/reports/payment/[reportId]` | Actualizar pago |
| DELETE | `/api/reports/delete/[id]` | Eliminar reporte |

## Agregar un nuevo tipo de analisis

Actualmente la logica esta en `src/app/api/reports/pdfmonkey/route.ts`. Para agregar un tipo:
1. Agregar el nuevo `AnalysisType` al enum y al mapa de areas en `pdfmonkey/route.ts`
2. Agregar variable de entorno `PDFMONKEY_TEMPLATE_NUEVO_TIPO`
3. Si `test_catalog.area` tiene un nuevo valor, agregarlo al mapa de deteccion

## Variables de entorno de PDFMonkey

```
PDFMONKEY_API_KEY                    # API key (obligatorio)
PDFMONKEY_TEMPLATE_VIROLOGY          # Template ID (tiene default)
PDFMONKEY_TEMPLATE_PHYTOPATOLOGY     # Template ID (tiene default)
PDFMONKEY_TEMPLATE_NEMATOLOGY        # Template ID (tiene default)
PDFMONKEY_TEMPLATE_BACTERIOLOGY      # Template ID (tiene default)
PDFMONKEY_TEMPLATE_EARLY_DETECTION   # Template ID (tiene default)
PDFMONKEY_TEMPLATE_DEFAULT           # Template ID (tiene default)
```

Si falta `PDFMONKEY_API_KEY`, el endpoint de reportes devuelve 500 con mensaje claro.

## Reglas

1. **No hardcodear template IDs** — usar variables de entorno con defaults
2. **Builders son funciones puras** — no hacen llamadas a DB ni efectos secundarios
3. **Loggear siempre** el tipo de analisis resuelto y template usado (facilita debug)
4. **El webhook de PDFMonkey es publico** — PDFMonkey no envia auth header. Validar con firma si se implementa en el futuro
5. **No bloquear al usuario** mientras se genera el PDF — la generacion es async
