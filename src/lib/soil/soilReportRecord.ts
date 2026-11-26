/** analysis_type de los informes de suelo que viven en public.reports. */
export const SOIL_REPORT_ANALYSIS_TYPE = 'suelo'

export function shouldRejectPhytosanitaryPdf(analysisType: string | null | undefined): boolean {
  return analysisType === SOIL_REPORT_ANALYSIS_TYPE
}

/**
 * Un informe de suelo tiene un solo cliente.
 * Las muestras elegidas que no comparten cliente no se guardan.
 */
export function singleSoilReportClientId(
  clientIds: string[]
): { ok: true; clientId: string } | { ok: false; error: string } {
  const distinctClientIds = [...new Set(clientIds.filter((clientId) => clientId.trim() !== ''))]
  if (distinctClientIds.length === 0) {
    return { ok: false, error: 'Las muestras no tienen cliente' }
  }
  if (distinctClientIds.length > 1) {
    return { ok: false, error: 'Un informe solo puede incluir muestras de un cliente' }
  }
  return { ok: true, clientId: distinctClientIds[0] }
}

/** El portal solo muestra un informe validado cuyo cliente está vinculado al usuario. */
export function consumerCanSeeSoilReport(
  report: { completed: boolean | null; clientId: string | null },
  linkedClientIds: string[]
): boolean {
  return report.completed === true && report.clientId !== null && linkedClientIds.includes(report.clientId)
}

/** Solo una URL https queda en la fila para el ojo y la descarga. */
export function storedSoilPdfUrls(downloadUrl: string | null | undefined): {
  renderedPdfUrl: string
  downloadUrl: string
} | null {
  if (!downloadUrl || !downloadUrl.startsWith('https://')) return null
  return { renderedPdfUrl: downloadUrl, downloadUrl }
}
