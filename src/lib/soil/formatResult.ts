export interface SoilResultValue {
  valueNumeric: number | null
  valueQualifier: string | null
  valueText: string | null
}

const NUMBER_FORMAT = new Intl.NumberFormat('es-CL', { maximumSignificantDigits: 6 })

/** Texto para pantalla e informe: "< 0,5", "ND", "1,2 × 10⁵", "Ausencia". */
export function formatSoilResultValue(result: SoilResultValue): string {
  if (result.valueQualifier === 'ND') return 'ND'
  if (result.valueNumeric === null) return result.valueText ?? ''

  const absoluteValue = Math.abs(result.valueNumeric)
  const formattedNumber =
    absoluteValue !== 0 && (absoluteValue >= 1e6 || absoluteValue < 1e-4)
      ? formatScientific(result.valueNumeric)
      : NUMBER_FORMAT.format(result.valueNumeric)

  return result.valueQualifier ? `${result.valueQualifier} ${formattedNumber}` : formattedNumber
}

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
}

function formatScientific(value: number): string {
  const [mantissa, exponent] = value.toExponential(2).split('e')
  const superscriptExponent = String(Number(exponent))
    .split('')
    .map((character) => SUPERSCRIPT_DIGITS[character] ?? character)
    .join('')
  return `${NUMBER_FORMAT.format(Number(mantissa))} × 10${superscriptExponent}`
}
