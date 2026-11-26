/** Ids de muestra guardados en el payload. El texto del código no se usa. */
export function sampleIdsFromReportPayload(
  payload: { samples?: Array<{ id?: string | null }> } | null | undefined
): string[] {
  const sampleIds: string[] = []
  const seenSampleIds = new Set<string>()
  for (const sample of payload?.samples ?? []) {
    const sampleId = sample.id
    if (!sampleId || seenSampleIds.has(sampleId)) continue
    seenSampleIds.add(sampleId)
    sampleIds.push(sampleId)
  }
  return sampleIds
}

/** Códigos actuales de soil_samples, en el orden de los ids del informe. */
export function codesForSampleIds(
  sampleIds: readonly string[],
  codeBySampleId: ReadonlyMap<string, string>
): string[] {
  const sampleCodes: string[] = []
  for (const sampleId of sampleIds) {
    const sampleCode = codeBySampleId.get(sampleId)
    if (!sampleCode) continue
    sampleCodes.push(sampleCode)
  }
  return sampleCodes
}

/** El buscador del listado compara contra esos códigos, no contra el texto de la planilla. */
export function reportMatchesSampleCode(sampleCodes: readonly string[], searchText: string): boolean {
  const normalizedSearch = searchText.trim().toLowerCase()
  if (!normalizedSearch) return true
  return sampleCodes.some((sampleCode) => sampleCode.toLowerCase().includes(normalizedSearch))
}
