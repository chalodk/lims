import { buildSoilPdfMonkeyPayload, resolveSoilPdfTemplateId, soilReportPdfFilename } from './reportPdf'
import type { SoilReportPayload } from './reportPayload'

const PDFMONKEY_DOCUMENTS_URL = 'https://api.pdfmonkey.io/api/v1/documents'
const PDF_READY_ATTEMPTS = 20
const PDF_POLL_INTERVAL_MS = 1500

type PdfMonkeyDocument = {
  id: string
  status: string
  downloadUrl: string | null
  failureCause: string | null
}

function pdfMonkeyApiKey(): string {
  return process.env.PDFMONKEY_API_KEY || '7mCRJHas8oqUQxsQX-in'
}

function readPdfMonkeyDocument(body: unknown): PdfMonkeyDocument | null {
  if (!body || typeof body !== 'object') return null
  const record = body as Record<string, unknown>
  const document = (
    record.document && typeof record.document === 'object' ? record.document : record
  ) as Record<string, unknown>
  if (typeof document.id !== 'string') return null
  return {
    id: document.id,
    status: typeof document.status === 'string' ? document.status : '',
    downloadUrl: typeof document.download_url === 'string' ? document.download_url : null,
    failureCause: typeof document.failure_cause === 'string' ? document.failure_cause : null,
  }
}

async function pdfMonkeyRequest(path: string, init?: RequestInit): Promise<PdfMonkeyDocument> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pdfMonkeyApiKey()}`,
      ...init?.headers,
    },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error('PDFMonkey rechazó el documento')
  }
  const document = readPdfMonkeyDocument(body)
  if (!document) throw new Error('PDFMonkey no devolvió el documento')
  return document
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function waitForSoilPdf(documentId: string): Promise<PdfMonkeyDocument> {
  let latest: PdfMonkeyDocument | null = null
  for (let attempt = 0; attempt < PDF_READY_ATTEMPTS; attempt += 1) {
    latest = await pdfMonkeyRequest(`${PDFMONKEY_DOCUMENTS_URL}/${documentId}`)
    if (latest.status === 'success' && latest.downloadUrl) return latest
    if (latest.status === 'failure') {
      throw new Error(latest.failureCause || 'PDFMonkey no pudo generar el PDF')
    }
    await wait(PDF_POLL_INTERVAL_MS)
  }
  throw new Error('El PDF todavía no está listo')
}

/** Pide el PDF a la plantilla de suelo y devuelve el enlace de descarga. */
export async function renderSoilReportPdf(input: {
  reportId: string
  payload: SoilReportPayload
  laboratoryName: string
  logoUrl?: string | null
  createdAt: string
}): Promise<string> {
  const templateId = resolveSoilPdfTemplateId(process.env.PDFMONKEY_TEMPLATE_SUELO)
  const templatePayload = buildSoilPdfMonkeyPayload({
    payload: input.payload,
    laboratoryName: input.laboratoryName,
    logoUrl: input.logoUrl,
    createdAt: input.createdAt,
  })
  const filename = soilReportPdfFilename(templatePayload.cliente, templatePayload.matriz)
  const created = await pdfMonkeyRequest(PDFMONKEY_DOCUMENTS_URL, {
    method: 'POST',
    body: JSON.stringify({
      document: {
        document_template_id: templateId,
        status: 'pending',
        payload: templatePayload,
        meta: {
          report_id: input.reportId,
          _filename: filename,
        },
      },
    }),
  })
  const ready = created.status === 'success' && created.downloadUrl ? created : await waitForSoilPdf(created.id)
  if (!ready.downloadUrl) throw new Error('El PDF no tiene enlace de descarga')
  return ready.downloadUrl
}
