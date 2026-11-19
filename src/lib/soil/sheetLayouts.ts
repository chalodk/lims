/** Juego de informe. El de producto no incluye los balances elementales. */
export type SoilReportSet = 'producto' | 'elemental'

export interface TransposedSection {
  /** Fragmento del título del bloque, sin tildes ni signos. */
  match: string
  reportSet: SoilReportSet
  basis: 'base_humeda' | 'base_seca'
}

export interface RowTableLayout {
  kind: 'rowTable'
  /** Fila del encabezado. Los datos empiezan en la siguiente. */
  headerRow: number
  /** prefix: "Dil (60 ul…)" corresponde al discriminador "dil". */
  discriminatorMatch: 'exact' | 'prefix'
}

export interface TransposedSectionsLayout {
  kind: 'transposedSections'
  sections: TransposedSection[]
}

export interface CodedLookupLayout {
  kind: 'codedLookup'
  categoryColumn: string
  /** Si esta celda tiene texto, esa es la descripción. */
  overrideColumn: string
  lookupKeyColumn: string
  lookupTextColumn: string
}

export interface SampleBlocksLayout {
  kind: 'sampleBlocks'
}

export type SheetLayout = RowTableLayout | TransposedSectionsLayout | CodedLookupLayout | SampleBlocksLayout

/** La hoja que no está en el registro se lee como una tabla con encabezado en la fila 1. */
export const rowTableLayout: RowTableLayout = {
  kind: 'rowTable',
  headerRow: 1,
  discriminatorMatch: 'exact',
}

const HUMIC_SECTIONS: TransposedSection[] = [
  { match: 'balance de c en el producto base humeda', reportSet: 'elemental', basis: 'base_humeda' },
  { match: 'balance de c en el producto base seca', reportSet: 'elemental', basis: 'base_seca' },
  { match: 'balance de n en el producto base humeda', reportSet: 'elemental', basis: 'base_humeda' },
  { match: 'balance de n en el producto base seca', reportSet: 'elemental', basis: 'base_seca' },
  { match: 'base humeda', reportSet: 'producto', basis: 'base_humeda' },
  { match: 'base seca', reportSet: 'producto', basis: 'base_seca' },
]

/**
 * Perfil de las hojas que no son una tabla estándar.
 * La clave es el nombre de la pestaña ya normalizado.
 */
export const sheetLayouts: Record<string, SheetLayout> = {
  'caco3 eq': { kind: 'rowTable', headerRow: 26, discriminatorMatch: 'exact' },
  rabanitos: { kind: 'rowTable', headerRow: 1, discriminatorMatch: 'prefix' },
  'sustancias húmicas': { kind: 'transposedSections', sections: HUMIC_SECTIONS },
  olor: {
    kind: 'codedLookup',
    categoryColumn: 'B',
    overrideColumn: 'E',
    lookupKeyColumn: 'G',
    lookupTextColumn: 'H',
  },
  'tamaño de partícula': { kind: 'sampleBlocks' },
}

/**
 * Las fracciones de los balances empiezan con "C-" o "N-".
 * El resto de los análisis pertenece al informe de producto.
 */
export function soilAnalysisReportSet(
  excelSheet: string | null,
  discriminator: string | null
): SoilReportSet {
  const sheet = (excelSheet ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()
  if (sheet !== 'sustancias húmicas') return 'producto'
  const label = (discriminator ?? '').trim().toLowerCase()
  if (label.startsWith('c-') || label.startsWith('n-')) return 'elemental'
  return 'producto'
}
