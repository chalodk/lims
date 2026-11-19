import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { buildSoilImportPreview } from '@/lib/soil/importPreview'
import { readSoilWorkbook } from '@/lib/soil/workbookReader'
import {
  commitSoilResults,
  createImportedSoilSamples,
  loadImportCatalog,
  loadRegisteredSamplesForImport,
  requireSoilLab,
} from '@/lib/services/soilService'

const SOIL_IMPORTS_BUCKET = 'soil-imports'
const MAX_WORKBOOK_BYTES = 25 * 1024 * 1024
const MAX_PREVIEW_RESULTS = 2000

export const runtime = 'nodejs'

/**
 * POST /api/soil/imports (multipart: file, mode=preview|commit)
 * preview: lee el Excel y devuelve lo que se guardaría, con errores y advertencias.
 * commit: repite la lectura en el servidor y guarda solo si no hay errores.
 */
export const POST = withAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const access = await requireSoilLab(supabase, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const formData = await request.formData().catch(() => null)
    const uploadedFile = formData?.get('file')
    const mode = formData?.get('mode') === 'commit' ? 'commit' : 'preview'

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json({ error: 'Adjunta la planilla de resultados (.xlsx)' }, { status: 400 })
    }
    if (!uploadedFile.name.toLowerCase().endsWith('.xlsx')) {
      return NextResponse.json({ error: 'La planilla debe ser un archivo .xlsx' }, { status: 400 })
    }
    if (uploadedFile.size > MAX_WORKBOOK_BYTES) {
      return NextResponse.json({ error: 'La planilla supera los 25 MB' }, { status: 413 })
    }

    const workbookBytes = Buffer.from(await uploadedFile.arrayBuffer())
    let sheets
    try {
      sheets = await readSoilWorkbook(workbookBytes)
    } catch {
      return NextResponse.json(
        { error: 'No se pudo leer la planilla. Verifica que sea un .xlsx válido' },
        { status: 400 }
      )
    }

    const [catalog, samples] = await Promise.all([
      loadImportCatalog(supabase, access.companyId),
      loadRegisteredSamplesForImport(supabase, access.companyId),
    ])
    const preview = buildSoilImportPreview({ sheets, catalog, samples })

    const analysisTitleById = new Map(catalog.map((analysis) => [analysis.id, analysis.reportTitle]))
    const sampleSummaries = summarizeBySample(preview.results)

    if (mode === 'preview') {
      return NextResponse.json({
        mode,
        hasErrors: preview.hasErrors,
        issues: preview.issues,
        columnChecks: preview.columnChecks,
        newSampleCodes: preview.newSampleCodes,
        unregisteredSampleCodes: preview.newSampleCodes,
        ignoredRowCount: preview.ignoredRowCount,
        resultCount: preview.results.length,
        sampleSummaries,
        results: preview.results.slice(0, MAX_PREVIEW_RESULTS).map((result) => ({
          ...result,
          analysisTitle: analysisTitleById.get(result.analysisId) ?? '',
        })),
      })
    }

    if (preview.results.length === 0) {
      return NextResponse.json({ error: 'La planilla no tiene resultados para guardar' }, { status: 422 })
    }

    const receivedAt = readReceivedAt(formData?.get('received_at'))
    let resultsToSave = preview.results
    if (preview.newSampleCodes.length > 0) {
      const clientId = formData?.get('client_id')
      if (typeof clientId !== 'string' || !/^[0-9a-f-]{36}$/i.test(clientId)) {
        return NextResponse.json(
          { error: 'Elige el cliente de las muestras que la planilla va a crear' },
          { status: 400 }
        )
      }
      if (!receivedAt) {
        return NextResponse.json({ error: 'La fecha de recepción no es válida' }, { status: 400 })
      }
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('id', clientId)
        .eq('company_id', access.companyId)
        .maybeSingle()
      if (!client) {
        return NextResponse.json({ error: 'Cliente no encontrado en tu laboratorio' }, { status: 400 })
      }

      let createdSampleIds: Map<string, string>
      try {
        createdSampleIds = await createImportedSoilSamples(supabase, {
          companyId: access.companyId,
          clientId,
          receivedAt,
          createdBy: user.id,
          codes: preview.newSampleCodes,
        })
      } catch (createError) {
        if (createError instanceof Error && createError.message === 'DUPLICATE_SAMPLE') {
          return NextResponse.json(
            { error: 'Una de las muestras nuevas ya existe. Vuelve a revisar la planilla' },
            { status: 409 }
          )
        }
        throw createError
      }

      resultsToSave = preview.results.map((result) =>
        result.sampleId
          ? result
          : { ...result, sampleId: createdSampleIds.get(result.sampleCode) ?? null, createsSample: false }
      )
    }

    const importId = randomUUID()
    const storagePath = `${access.companyId}/${importId}.xlsx`
    const storageAdmin = createServiceRoleClient()
    const { error: uploadError } = await storageAdmin.storage
      .from(SOIL_IMPORTS_BUCKET)
      .upload(storagePath, workbookBytes, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: false,
      })
    if (uploadError) throw new Error(`No se pudo guardar la planilla: ${uploadError.message}`)

    const { error: importError } = await supabase.from('soil_result_imports').insert({
      id: importId,
      company_id: access.companyId,
      file_name: uploadedFile.name,
      storage_path: storagePath,
      uploaded_by: user.id,
      summary: {
        resultCount: preview.results.length,
        sampleCount: sampleSummaries.length,
        warningCount: preview.issues.length,
        newSampleCodes: preview.newSampleCodes,
      },
    })
    if (importError) {
      await storageAdmin.storage.from(SOIL_IMPORTS_BUCKET).remove([storagePath])
      throw new Error(importError.message)
    }

    const commitSummary = await commitSoilResults(supabase, resultsToSave, importId)
    return NextResponse.json({ mode, importId, ...commitSummary })
  } catch (error) {
    console.error('Error en POST /api/soil/imports:', error)
    return NextResponse.json(
      {
        error: 'Error al importar la planilla de resultados',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})

function readReceivedAt(value: FormDataEntryValue | null | undefined): string | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  return value
}

function summarizeBySample(results: { sampleId: string | null; sampleCode: string; subsampleNumber: number }[]) {
  const summaryBySampleId = new Map<
    string,
    { sampleId: string | null; sampleCode: string; resultCount: number; subsampleNumbers: Set<number> }
  >()
  for (const result of results) {
    const summary = summaryBySampleId.get(result.sampleCode) ?? {
      sampleId: result.sampleId,
      sampleCode: result.sampleCode,
      resultCount: 0,
      subsampleNumbers: new Set<number>(),
    }
    summary.resultCount += 1
    summary.subsampleNumbers.add(result.subsampleNumber)
    summaryBySampleId.set(result.sampleCode, summary)
  }
  return [...summaryBySampleId.values()].map((summary) => ({
    sampleId: summary.sampleId,
    sampleCode: summary.sampleCode,
    resultCount: summary.resultCount,
    subsampleCount: summary.subsampleNumbers.size,
  }))
}
