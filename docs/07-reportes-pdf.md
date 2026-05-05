# 07 — Reportes y PDFMonkey

## Proposito

Este documento describe el sistema de generacion de reportes PDF, la integracion con PDFMonkey, y el patron builder por tipo de analisis.

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

## Tipos de analisis y builders

Cada tipo de analisis tiene su propio template PDFMonkey y builder:

| Tipo | Enum | Builder | Template Env Var |
|---|---|---|---|
| Virologia | `virology` | `builders/virology.ts` | `PDFMONKEY_TEMPLATE_VIROLOGY` |
| Fitopatologia | `phytopatology` | `builders/phytopatology.ts` | `PDFMONKEY_TEMPLATE_PHYTOPATOLOGY` |
| Nematologia | `nematology` | `builders/nematology.ts` | `PDFMONKEY_TEMPLATE_NEMATOLOGY` |
| Bacteriologia | `bacteriology` | `builders/bacteriology.ts` | `PDFMONKEY_TEMPLATE_BACTERIOLOGY` |
| Deteccion precoz | `early_detection` | `builders/earlyDetection.ts` | `PDFMONKEY_TEMPLATE_EARLY_DETECTION` |
| Default | `default` | `builders/default.ts` | `PDFMONKEY_TEMPLATE_DEFAULT` |

## Registry (deteccion automatica)

`src/lib/reports/pdfmonkey/builders/registry.ts`

La funcion `getAnalysisTypeFromTestArea()` determina el tipo:

1. **Primario**: lee `sample_tests.test_catalog.area` del enum (nematologia, fitopatologia, virologia, deteccion_precoz, bacteriologia)
2. **Fallback**: keyword matching sobre `test_area` (texto)
3. **Default**: si no se puede determinar

`groupResultadosByAnalysisType()` agrupa resultados por tipo → util si un reporte incluye multiples analisis.

## Builders (patron)

Cada builder exporta una funcion pura:

```ts
// src/lib/reports/pdfmonkey/builders/virology.ts
export function buildVirologyPayload(
  report: ReportData,
  client: ClientData | null,
  resultados: ResultadoData[],
  analyst?: AnalystInfo
): Record<string, unknown>
```

El builder mapea los datos del LIMS al formato que espera el template PDFMonkey. Cada template tiene su propia estructura de payload.

### Funciones compartidas entre builders

`src/lib/reports/pdfmonkey/utils.ts` (228 lineas, 10 funciones):

- `formatDateDDMMYYYY` — formateo de fechas
- `buildSampleIdentification` — identificacion de muestra (codigo, especie, etc.)
- `buildPersonaTomoMuestra` — quien tomo la muestra
- `generateReportNumber` — genera numero unico de reporte
- `parseFindings` — parsea hallazgos de JSON
- `collectAllTests` — recolecta todos los tests de resultados
- `buildMetodologiaDescripcionFromFindings` — descripcion de metodologia
- `resolveMetodologiaDescripcion` — resolucion de metodologia
- `wrapHtmlPreservingWhitespaceForPdf` — wrapping HTML para PDF
- `resolveTipoAnalisisDescripcionFromCatalog` — descripcion de tipo de analisis

## Generacion de numero de reporte

`generateReportNumber()` en `utils.ts`:

- **General**: `YYMM-XXXXX` (ej: `2604-00123`)
- **Nematologia**: `NEM-YYMM-XXXXX` (ej: `NEM-2604-00123`)
- `Date.now() % 100000` → 100,000 valores unicos por ciclo
- Antes usaba `Math.random() * 1000` (solo 1,000 valores, riesgo de colision)

## Endpoints de reportes

| Metodo | Ruta | Proposito |
|---|---|---|
| POST | `/api/reports` | Crear reporte + disparar PDFMonkey |
| GET | `/api/reports` | Listar reportes |
| GET | `/api/reports/view/[id]` | Vista previa |
| GET | `/api/reports/pdf/[filename]` | Descargar PDF |
| POST | `/api/reports/pdfmonkey` | Webhook de PDFMonkey |
| GET | `/api/reports/templates` | Listar templates |
| POST | `/api/reports/templates` | Crear template |
| PATCH | `/api/reports/status/[reportId]` | Actualizar estado |
| PATCH | `/api/reports/payment/[reportId]` | Actualizar pago |
| DELETE | `/api/reports/delete/[id]` | Eliminar reporte |

## Agregar un nuevo tipo de analisis

1. Crear builder en `src/lib/reports/pdfmonkey/builders/nuevoTipo.ts`
2. Registrar en `registry.ts`: agregar al enum `AnalysisType`, al mapa `AREA_ENUM_TO_TYPE`, y a `PDF_TEMPLATES`
3. Agregar variable de entorno `PDFMONKEY_TEMPLATE_NUEVO_TIPO`
4. Si `test_catalog.area` tiene un nuevo valor, agregarlo a `AREA_ENUM_TO_TYPE`

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
