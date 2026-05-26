# 07 — Reportes y PDFMonkey

> Última actualización: 2026-05-20.

## Proposito

Este documento describe el sistema de generacion de reportes PDF, la integracion con PDFMonkey, y el patron builder por tipo de analisis.

## Documentos relacionados

| Doc | Relacion |
|---|---|
| `03-api-routes.md` | Endpoints de reportes |
| `04-base-de-datos.md` | Tablas reports, report_templates, report_assets, analysis_types |
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
   a. Resuelve el tipo de analisis via `getAnalysisTypeFromTestArea()` del registro central
   b. Selecciona el template PDFMonkey via `getTemplateId()`
   c. Llama al builder correspondiente
   d. POST a PDFMonkey API con { template_id, payload }
   e. Actualiza report a status: 'generated'
4. PDFMonkey genera el PDF async
5. Webhook POST /api/reports/pdfmonkey notifica cuando esta listo
6. Usuario descarga desde /api/reports/pdf/[filename]
```

## Tipos de analisis y templates

Cada tipo de analisis tiene su propio template PDFMonkey. La fuente unica de verdad es `src/config/analysisTypes.ts`, que centraliza claves canonicas, etiquetas en espanol, metadatos de UI, mapeo a areas de BD y templates. Los payload builders estan en `src/app/api/reports/pdfmonkey/route.ts`.

| Tipo | Clave | Label UI | Template Env Var |
|---|---|---|---|
| Virologia | `virology` | Virologico | `PDFMONKEY_TEMPLATE_VIROLOGY` |
| Fitopatologia | `phytopatology` | Fitopatologico | `PDFMONKEY_TEMPLATE_PHYTOPATOLOGY` |
| Nematologia | `nematology` | Nematologico | `PDFMONKEY_TEMPLATE_NEMATOLOGY` |
| Bacteriologia | `bacteriology` | Bacteriologico | `PDFMONKEY_TEMPLATE_BACTERIOLOGY` |
| Deteccion precoz | `early_detection` | Deteccion Precoz | `PDFMONKEY_TEMPLATE_EARLY_DETECTION` |
| Default | `default` | Desconocido | `PDFMONKEY_TEMPLATE_DEFAULT` |

### Registro central (`src/config/analysisTypes.ts`)

El registro `ANALYSIS_TYPE_REGISTRY` contiene para cada tipo: clave, label, inicial, colores Tailwind, areas de BD asociadas, env var del template, fallback ID, y textos por defecto (titulo, descripcion, metodologia).

Funciones helper exportadas:
- `getAnalysisTypeFromTestArea(area)` — lookup explicito, reemplaza 3 copias duplicadas
- `getDbAreaFromLabel(label)` / `getLabelFromDbArea(area)` — mapeo bidireccional
- `getAnalysisTypeIndicator(testAreas)` — indicador visual para UI
- `groupResultsByAnalysisType(resultados)` — agrupacion para generacion de PDFs
- `getTemplateId(type)` — resuelve template ID (env var o fallback, server-side)
- `getDefaultsForType(type)` — textos por defecto para payloads
- `getAllLabels()` / `getAllAreaFilterOptions()` — opciones para dropdowns

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

1. Agregar la clave a `ANALYSIS_TYPE_KEYS` en `src/config/analysisTypes.ts`
2. Agregar entrada completa en `ANALYSIS_TYPE_REGISTRY` (label, colores, dbAreas, templateEnvVar, fallbackTemplateId, textos por defecto)
3. Agregar variable de entorno `PDFMONKEY_TEMPLATE_NUEVO_TIPO` (con fallback hardcodeado en el registro)
4. Agregar el `payloadBuilder` en `PDF_TEMPLATES` dentro de `pdfmonkey/route.ts`
5. Si `test_catalog.area` tiene un nuevo valor, agregarlo a `DB_AREA_VALUES` y al `AreaType` en `database.ts`

Sin necesidad de tocar: funciones de deteccion, indicadores de UI, ni mappings de labels — todo se deriva del registro.

### Tabla `analysis_types` (BD)

El registro estatico de `src/config/analysisTypes.ts` tiene su espejo en la tabla `public.analysis_types`. La UI de customer success (`/admin/analysis-types`) lee y escribe esta tabla. El codigo usa el registro estatico como fallback; la funcion `getCachedAnalysisTypes()` (server-side) lee de BD con cache en memoria.

### API admin de tipos de analisis

Endpoints para gestionar tipos desde la UI de customer success:

| Metodo | Ruta | Proposito |
|---|---|---|
| GET | `/api/admin/analysis-types` | Listar todos los tipos |
| POST | `/api/admin/analysis-types` | Crear nuevo tipo |
| PATCH | `/api/admin/analysis-types/[id]` | Editar tipo existente |
| DELETE | `/api/admin/analysis-types/[id]` | Soft-delete (active = false) |

Requieren rol `admin`. Siguen el patron de `/api/settings/users`.

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

## Resolucion de Template ID

El template ID de PDFMonkey se resuelve con esta cadena de prioridad (4 niveles):

1. **Company-specific** (`company_analysis_type_templates.pdfmonkey_template_id`) — si la company tiene un template personalizado configurado via `/settings`
2. **Global en BD** (`analysis_types.pdfmonkey_template_id`) — configurado via UI de Customer Success en `/admin/analysis-types`
3. **Variable de entorno** (`PDFMONKEY_TEMPLATE_XXX`) — definido en el despliegue
4. **Hardcoded fallback** (`ANALYSIS_TYPE_REGISTRY[type].fallbackTemplateId`) — ultimo recurso

### Tabla `company_analysis_type_templates`

Permite que cada company use templates PDFMonkey personalizados con sus propios logos, colores y formato. Columnas: `id`, `company_id` (FK), `analysis_type_key`, `pdfmonkey_template_id`, `created_at`, `updated_at`. Unique constraint en `(company_id, analysis_type_key)`.

### API de company templates

| Metodo | Ruta | Proposito |
|---|---|---|
| GET | `/api/admin/company-templates` | Listar templates de la company del usuario |
| POST | `/api/admin/company-templates` | Crear o actualizar template (upsert) |
| DELETE | `/api/admin/company-templates/[id]` | Eliminar override de template |

Auth: `withAuth()` + role check `admin` (per-company).

## Reglas

1. **No hardcodear template IDs** — usar variables de entorno con defaults
2. **Builders son funciones puras** — no hacen llamadas a DB ni efectos secundarios
3. **Loggear siempre** el tipo de analisis resuelto y template usado (facilita debug)
4. **El webhook de PDFMonkey es publico** — PDFMonkey no envia auth header. Validar con firma si se implementa en el futuro
5. **No bloquear al usuario** mientras se genera el PDF — la generacion es async
