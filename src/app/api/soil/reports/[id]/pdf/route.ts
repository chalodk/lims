import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { requireSoilLab } from '@/lib/services/soilService'
import { buildSoilPdfMonkeyPayload } from '@/lib/soil/reportPdf'
import type { SoilReportPayload } from '@/lib/soil/reportPayload'

export const maxDuration = 60

const PDFMONKEY_DOCUMENTS_URL = 'https://api.pdfmonkey.io/api/v1/documents'
const PDF_READY_ATTEMPTS = 20
const PDF_POLL_INTERVAL_MS = 1500

type StoredSoilReport = {
  id: string
  created_at: string
  payload: SoilReportPayload
}

type PdfMonkeyDocument = {
  id: string
  status: string
  downloadUrl: string | null
  failureCause: string | null
}

/** Misma cuenta que los PDF de plagas. La variable permite reemplazarla sin tocar el código. */
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

/** POST /api/soil/reports/:id/pdf — pide el PDF a la plantilla de suelo y devuelve el enlace. */
export const POST = withAuth(async (_request: NextRequest, { user, supabase, params }) => {
  try {
    const access = await requireSoilLab(supabase, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const templateId = process.env.PDFMONKEY_TEMPLATE_SUELO
    if (!templateId) {
      return NextResponse.json({ error: 'Falta la plantilla de suelo' }, { status: 503 })
    }

    const { id: reportId } = await (params as Promise<{ id: string }>)
    const { data, error } = await supabase
      .from('soil_reports')
      .select('id, created_at, payload')
      .eq('id', reportId)
      .eq('company_id', access.companyId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name')
      .eq('id', access.companyId)
      .maybeSingle()
    if (companyError) throw new Error(companyError.message)

    const report = data as unknown as StoredSoilReport
    const templatePayload = buildSoilPdfMonkeyPayload({
      payload: report.payload,
      laboratoryName: company?.name || 'Laboratorio',
      createdAt: report.created_at,
    })
    const filename = `Informe_${templatePayload.matriz || 'suelo'}.pdf`

    const created = await pdfMonkeyRequest(PDFMONKEY_DOCUMENTS_URL, {
      method: 'POST',
      body: JSON.stringify({
        document: {
          document_template_id: templateId,
          status: 'pending',
          payload: templatePayload,
          meta: {
            report_id: report.id,
            _filename: filename,
          },
        },
      }),
    })
    const ready = created.status === 'success' && created.downloadUrl ? created : await waitForSoilPdf(created.id)

    return NextResponse.json({ downloadUrl: ready.downloadUrl })
  } catch (error) {
    console.error('Error en POST /api/soil/reports/[id]/pdf:', error)
    return NextResponse.json(
      {
        error: 'No se pudo generar el PDF del informe',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 502 }
    )
  }
})
