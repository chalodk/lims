export const DEFAULT_COLUMN_LABELS: Record<string, Record<string, string>> = {
  nematology: {
    name: 'Género y/o especie identificada',
    quantity: 'N° nematodos/250 cm³ de suelo',
  },
  virology: {
    identification: 'Identificación',
    method: 'Técnica utilizada',
    virus: 'Virus',
    result: 'Resultado',
  },
  bacteriology: {
    identification: 'Identificación',
    method: 'Técnica utilizada',
    microorganism: 'Bacteria',
    result: 'Resultado',
  },
  phytopathology: {
    sampleNumber: 'N° de muestra',
    identification: 'Identificación de la muestra',
    microorganism: 'Microorganismo Identificado',
    colonyCount: 'Recuento de microorganismos (N° de colonias/dilución)',
    dilution: 'Dilución utilizada',
    dilution10_1: '10⁻¹',
    dilution10_2: '10⁻²',
    dilution10_3: '10⁻³',
  },
  early_detection: {
    sampleCode: 'Código Muestra',
    identification: 'Identificación',
    variety: 'Variedad',
    unitsEvaluated: 'Unidades Evaluadas',
    severityScale: 'Escala de Severidad',
    severity0: '0',
    severity1: '1',
    severity2: '2',
    severity3: '3',
  },
}

export function getDefaultColumnLabels(areaKey: string): Record<string, string> {
  return { ...(DEFAULT_COLUMN_LABELS[areaKey] ?? {}) }
}

export function mergeColumnLabels(
  areaKey: string,
  userLabels: Record<string, string> | null | undefined
): Record<string, string> {
  return {
    ...getDefaultColumnLabels(areaKey),
    ...(userLabels ?? {}),
  }
}

function readColumnLabelsFromFindings(findings: unknown): Record<string, string> | null {
  if (!findings || typeof findings !== 'object' || !('columnLabels' in findings)) {
    return null
  }
  const labels = (findings as Record<string, unknown>).columnLabels
  if (!labels || typeof labels !== 'object' || Array.isArray(labels)) {
    return null
  }
  return labels as Record<string, string>
}

export function getColumnLabel(
  findings: unknown,
  areaKey: string,
  labelKey: string,
  fallback?: string
): string {
  const labels = readColumnLabelsFromFindings(findings)
  if (labels?.[labelKey]) return labels[labelKey]
  return DEFAULT_COLUMN_LABELS[areaKey]?.[labelKey] || fallback || labelKey
}

export function resolveResultColumnLabels(
  findings: unknown,
  areaKey: string
): Record<string, string> {
  return mergeColumnLabels(areaKey, readColumnLabelsFromFindings(findings))
}

export function resolvePdfColumnLabels(
  resultados: Array<{ findings?: unknown }>,
  areaKey: string
): Record<string, string> {
  const firstResult = resultados[0]
  if (!firstResult) return getDefaultColumnLabels(areaKey)
  return resolveResultColumnLabels(firstResult.findings, areaKey)
}
