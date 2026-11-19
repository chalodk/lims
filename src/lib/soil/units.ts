/** Conductividad eléctrica expresada en µS/cm. */
const CONDUCTIVITY_FACTORS_TO_MICROSIEMENS: Record<string, number> = {
  'µs/cm': 1,
  'us/cm': 1,
  'ms/cm': 1000,
  'ds/m': 1000,
}

export function normalizeUnitLabel(unit: string | null | undefined): string {
  return (unit ?? '')
    .normalize('NFC')
    .replace(/μ/g, 'µ')
    .replace(/\s+/g, '')
    .toLowerCase()
}

/**
 * Convierte un valor a la unidad del catálogo. null si no hay conversión conocida.
 * Unidades iguales (ignorando espacios, mayúsculas y la variante de µ) no cambian el valor.
 */
export function convertToCatalogUnit(
  value: number,
  sourceUnit: string | null | undefined,
  catalogUnit: string | null | undefined
): number | null {
  const normalizedSource = normalizeUnitLabel(sourceUnit)
  const normalizedTarget = normalizeUnitLabel(catalogUnit)
  if (normalizedSource === normalizedTarget) return value

  const sourceFactor = CONDUCTIVITY_FACTORS_TO_MICROSIEMENS[normalizedSource]
  const targetFactor = CONDUCTIVITY_FACTORS_TO_MICROSIEMENS[normalizedTarget]
  if (sourceFactor === undefined || targetFactor === undefined) return null

  return (value * sourceFactor) / targetFactor
}
