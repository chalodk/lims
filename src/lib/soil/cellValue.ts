export type SoilValueQualifier = '<' | '>' | 'ND'

export type ParsedSoilValue =
  | { kind: 'empty' }
  | { kind: 'formula_error'; raw: string }
  | { kind: 'numeric'; valueNumeric: number | null; qualifier: SoilValueQualifier | null; raw: string }
  | { kind: 'text'; valueText: string; raw: string }

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
  '⁻': '-',
}

function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(',', '.')
  if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

/** "2,6*10⁵", "2,2*10 ⁵", "1,3 *10⁶", "9*10^4", "1x10³" */
function parseScientific(text: string): number | null {
  const match = text
    .trim()
    .match(/^([-+]?\d+(?:[.,]\d+)?)?\s*[*x×]?\s*10\s*(?:\^\s*([-+]?\d+)|([⁻]?[⁰¹²³⁴⁵⁶⁷⁸⁹]+))$/)
  if (!match) return null
  const [, mantissaText, caretExponent, superscriptExponent] = match
  const mantissa = mantissaText ? parseDecimal(mantissaText) : 1
  if (mantissa === null) return null
  const exponentText =
    caretExponent ??
    [...(superscriptExponent ?? '')].map((character) => SUPERSCRIPT_DIGITS[character]).join('')
  const exponent = Number(exponentText)
  if (!Number.isInteger(exponent)) return null
  return Number(`${mantissa}e${exponent}`)
}

function parseNumberLike(text: string): number | null {
  return parseDecimal(text) ?? parseScientific(text)
}

/**
 * Interpreta una celda de resultado de la planilla del laboratorio.
 * Los números con coma decimal, la notación 10ⁿ con superíndices, los censurados
 * ("<3", "<1*10³") y "ND" son numéricos; los errores de fórmula se reportan aparte.
 */
export function parseSoilCellValue(cell: string | number | null | undefined): ParsedSoilValue {
  if (cell === null || cell === undefined) return { kind: 'empty' }

  if (typeof cell === 'number') {
    if (!Number.isFinite(cell)) return { kind: 'formula_error', raw: String(cell) }
    return { kind: 'numeric', valueNumeric: cell, qualifier: null, raw: String(cell) }
  }

  const raw = cell.trim()
  if (raw === '') return { kind: 'empty' }
  if (raw.startsWith('#')) return { kind: 'formula_error', raw }
  if (/^n\.?\s*d\.?$/i.test(raw)) return { kind: 'numeric', valueNumeric: null, qualifier: 'ND', raw }

  const censoredMatch = raw.match(/^([<>])\s*(.+)$/)
  if (censoredMatch) {
    const censoredValue = parseNumberLike(censoredMatch[2])
    if (censoredValue !== null) {
      return {
        kind: 'numeric',
        valueNumeric: censoredValue,
        qualifier: censoredMatch[1] as '<' | '>',
        raw,
      }
    }
  }

  const numericValue = parseNumberLike(raw)
  if (numericValue !== null) {
    return { kind: 'numeric', valueNumeric: numericValue, qualifier: null, raw }
  }

  return { kind: 'text', valueText: raw, raw }
}

/** Códigos de muestra/submuestra: Excel los entrega como 1813 o "1813.0". */
export function normalizeSampleCode(cell: string | number | null | undefined): string | null {
  if (cell === null || cell === undefined) return null
  if (typeof cell === 'number') {
    return Number.isInteger(cell) ? String(cell) : null
  }
  const trimmed = cell.trim()
  if (/^\d+(\.0+)?$/.test(trimmed)) return String(Number(trimmed))
  return null
}

export function parseSubsampleNumber(cell: string | number | null | undefined): number | null {
  const code = normalizeSampleCode(cell)
  if (code === null) return null
  const number = Number(code)
  return number > 0 ? number : null
}
