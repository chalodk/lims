import {
  normalizeSampleCode,
  parseSoilCellValue,
  parseSubsampleNumber,
  type SoilValueQualifier,
} from './cellValue'
import {
  rowTableLayout,
  sheetLayouts,
  type CodedLookupLayout,
  type RowTableLayout,
  type TransposedSection,
} from './sheetLayouts'
import { convertToCatalogUnit, normalizeUnitLabel } from './units'

export type SoilCellPrimitive = string | number | null

/** Una pestaña: filas (base 1) → columnas por letra → valor. */
export interface SoilSheetGrid {
  name: string
  rows: Map<number, Map<string, SoilCellPrimitive>>
}

export interface SoilCatalogAnalysis {
  id: string
  reportTitle: string
  unit: string | null
  resultKind: 'numeric' | 'text'
  excelSheet: string
  excelValueColumn: string
  excelDiscriminatorColumn: string | null
  excelDiscriminatorValue: string | null
  excelUnitColumn: string | null
  /** null: la pestaña no tiene submuestra y se informa como submuestra 1. */
  excelSubsampleColumn: string | null
  /** Distingue filas del mismo título, como la base húmeda y la base seca. */
  methodLabel: string | null
  matrixIds: string[]
}

export interface RegisteredSoilSample {
  id: string
  code: string
  subsamples: { id: string; number: number }[]
  /** La planilla ya no cruza por la matriz ni por los análisis pedidos de la muestra. */
  matrixId?: string
  requestedAnalysisIds?: string[]
}

export interface PlannedSoilResult {
  sampleId: string | null
  sampleCode: string
  /** true cuando el código no existe y el guardado tiene que crear la muestra. */
  createsSample: boolean
  subsampleNumber: number
  subsampleId: string | null
  analysisId: string
  valueNumeric: number | null
  valueQualifier: SoilValueQualifier | null
  valueText: string | null
  rawValue: string
  unit: string | null
  basis: string | null
  sheetName: string
  rowNumber: number
}

export type SoilImportIssueCode =
  | 'header_not_in_row_1'
  | 'empty_header_a1'
  | 'missing_subsample'
  | 'unknown_discriminator'
  | 'duplicate_row'
  | 'formula_error'
  | 'text_in_numeric'
  | 'unknown_unit'
  | 'ambiguous_analysis'

export interface SoilImportIssue {
  severity: 'error' | 'warning'
  code: SoilImportIssueCode
  sheetName: string
  rowNumber: number | null
  message: string
}

export interface SoilImportColumnCheck {
  analysisId: string
  reportTitle: string
  sheetName: string
  column: string
  headerText: string | null
  resultCount: number
}

export interface SoilImportPreview {
  results: PlannedSoilResult[]
  issues: SoilImportIssue[]
  columnChecks: SoilImportColumnCheck[]
  /** Códigos de la planilla que todavía no tienen muestra. El guardado los crea. */
  newSampleCodes: string[]
  /** Mismo listado que newSampleCodes. Se mantiene para la respuesta de la vista previa. */
  unregisteredSampleCodes: string[]
  ignoredRowCount: number
  hasErrors: boolean
}

export function normalizeSheetName(name: string): string {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()
}

function normalizeDiscriminator(value: SoilCellPrimitive | undefined): string {
  if (value === null || value === undefined) return ''
  return String(value).normalize('NFC').replace(/\s+/g, '').toLowerCase()
}

function cellAsText(value: SoilCellPrimitive | undefined): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text === '' ? null : text
}

function normalizeBasis(value: SoilCellPrimitive | undefined): string | null {
  const text = cellAsText(value)?.normalize('NFC').toLowerCase()
  if (text === 'base seca') return 'base_seca'
  if (text === 'base humeda' || text === 'base húmeda') return 'base_humeda'
  return null
}

function findHeaderColumn(headerRow: Map<string, SoilCellPrimitive>, headerText: string): string | null {
  for (const [column, value] of headerRow) {
    if (cellAsText(value)?.toLowerCase() === headerText) return column
  }
  return null
}

function firstRowWithData(grid: SoilSheetGrid): number | null {
  const rowNumbers = [...grid.rows.keys()].sort((left, right) => left - right)
  for (const rowNumber of rowNumbers) {
    const row = grid.rows.get(rowNumber)
    if (row && [...row.values()].some((value) => cellAsText(value) !== null)) return rowNumber
  }
  return null
}

/**
 * Cruza el Excel del laboratorio con el catálogo.
 * La forma de cada hoja sale del registro; la que no está registrada es una tabla con encabezado en la fila 1.
 * Un código que no existe se anota para crear la muestra al guardar.
 */
export function buildSoilImportPreview(input: {
  sheets: SoilSheetGrid[]
  catalog: SoilCatalogAnalysis[]
  samples: RegisteredSoilSample[]
}): SoilImportPreview {
  const issues: SoilImportIssue[] = []
  const results: PlannedSoilResult[] = []
  const columnChecks = new Map<string, SoilImportColumnCheck>()
  const newSampleCodes = new Set<string>()
  let ignoredRowCount = 0

  const sheetsByName = new Map(input.sheets.map((sheet) => [normalizeSheetName(sheet.name), sheet]))
  const samplesByCode = new Map(input.samples.map((sample) => [sample.code, sample]))

  const catalogBySheet = new Map<string, SoilCatalogAnalysis[]>()
  for (const analysis of input.catalog) {
    const sheetKey = normalizeSheetName(analysis.excelSheet)
    catalogBySheet.set(sheetKey, [...(catalogBySheet.get(sheetKey) ?? []), analysis])
  }

  const firstRowBySubsampleAnalysis = new Map<string, number>()

  for (const [sheetKey, sheetAnalyses] of catalogBySheet) {
    const grid = sheetsByName.get(sheetKey)

    if (!grid) continue

    const sheetState: SheetReadState = {
      grid,
      sheetAnalyses,
      samplesByCode,
      issues,
      results,
      columnChecks,
      newSampleCodes,
      firstRowBySubsampleAnalysis,
    }
    const layout = sheetLayouts[sheetKey] ?? rowTableLayout
    if (layout.kind === 'sampleBlocks') {
      readParticleSizeBlocks(sheetState)
      continue
    }
    if (layout.kind === 'transposedSections') {
      readHumicSubstances(sheetState, layout.sections)
      continue
    }
    if (layout.kind === 'codedLookup') {
      readOdorSheet(sheetState, layout)
      continue
    }
    readRowTable(sheetState, layout, () => {
      ignoredRowCount += 1
    })
  }

  const samplesToCreate = [...newSampleCodes].sort((left, right) => Number(left) - Number(right))

  return {
    results,
    issues,
    columnChecks: [...columnChecks.values()].filter((check) => check.resultCount > 0),
    newSampleCodes: samplesToCreate,
    unregisteredSampleCodes: samplesToCreate,
    ignoredRowCount,
    hasErrors: issues.some((issue) => issue.severity === 'error'),
  }
}

interface SheetReadState {
  grid: SoilSheetGrid
  sheetAnalyses: SoilCatalogAnalysis[]
  samplesByCode: Map<string, RegisteredSoilSample>
  issues: SoilImportIssue[]
  results: PlannedSoilResult[]
  columnChecks: Map<string, SoilImportColumnCheck>
  newSampleCodes: Set<string>
  firstRowBySubsampleAnalysis: Map<string, number>
}

interface LabeledSample {
  sampleCode: string
  subsampleNumber: number
}

function appendAnalysisResult(
  state: SheetReadState,
  input: {
    sample: RegisteredSoilSample | null
    sampleCode: string
    subsampleNumber: number
    analysis: SoilCatalogAnalysis
    cell: SoilCellPrimitive
    valueColumn: string
    basis: string | null
    rowNumber: number
    row: Map<string, SoilCellPrimitive>
    rawValue?: string
  }
) {
  const duplicateKey = `${input.sample?.id ?? input.sampleCode}|${input.subsampleNumber}|${input.analysis.id}`
  const firstRowNumber = state.firstRowBySubsampleAnalysis.get(duplicateKey)
  if (firstRowNumber !== undefined) {
    state.issues.push({
      severity: 'warning',
      code: 'duplicate_row',
      sheetName: state.grid.name,
      rowNumber: input.rowNumber,
      message: `Muestra ${input.sampleCode}-${input.subsampleNumber} repetida para ${input.analysis.reportTitle} (ya estaba en la fila ${firstRowNumber}).`,
    })
    return
  }
  state.firstRowBySubsampleAnalysis.set(duplicateKey, input.rowNumber)

  const parsedValue = parseSoilCellValue(input.cell)
  if (parsedValue.kind === 'empty') return

  if (parsedValue.kind === 'formula_error') {
    state.issues.push({
      severity: 'error',
      code: 'formula_error',
      sheetName: state.grid.name,
      rowNumber: input.rowNumber,
      message: `Muestra ${input.sampleCode}-${input.subsampleNumber}, ${input.analysis.reportTitle}: la celda ${input.valueColumn}${input.rowNumber} tiene un error de fórmula (${parsedValue.raw}).`,
    })
    return
  }

  let valueNumeric: number | null = null
  let valueQualifier: SoilValueQualifier | null = null
  let valueText: string | null = null

  if (input.analysis.resultKind === 'text') {
    valueText = parsedValue.raw
  } else if (parsedValue.kind === 'text') {
    state.issues.push({
      severity: 'error',
      code: 'text_in_numeric',
      sheetName: state.grid.name,
      rowNumber: input.rowNumber,
      message: `Muestra ${input.sampleCode}-${input.subsampleNumber}, ${input.analysis.reportTitle}: "${parsedValue.raw}" no es un número.`,
    })
    return
  } else {
    valueNumeric = parsedValue.valueNumeric
    valueQualifier = parsedValue.qualifier
  }

  if (valueNumeric !== null && input.analysis.excelUnitColumn) {
    const sourceUnit = cellAsText(input.row.get(input.analysis.excelUnitColumn))
    const convertedValue = convertToCatalogUnit(valueNumeric, sourceUnit, input.analysis.unit)
    if (convertedValue === null) {
      state.issues.push({
        severity: 'error',
        code: 'unknown_unit',
        sheetName: state.grid.name,
        rowNumber: input.rowNumber,
        message: `Muestra ${input.sampleCode}-${input.subsampleNumber}, ${input.analysis.reportTitle}: no se puede convertir "${sourceUnit ?? '(sin unidad)'}" a ${input.analysis.unit}.`,
      })
      return
    }
    valueNumeric = convertedValue
  }

  const existingSubsample = input.sample?.subsamples.find(
    (subsample) => subsample.number === input.subsampleNumber
  )
  if (!input.sample) state.newSampleCodes.add(input.sampleCode)
  state.results.push({
    sampleId: input.sample?.id ?? null,
    sampleCode: input.sampleCode,
    createsSample: input.sample === null,
    subsampleNumber: input.subsampleNumber,
    subsampleId: existingSubsample?.id ?? null,
    analysisId: input.analysis.id,
    valueNumeric,
    valueQualifier,
    valueText,
    rawValue: input.rawValue ?? parsedValue.raw,
    unit: input.analysis.unit,
    basis: input.basis,
    sheetName: state.grid.name,
    rowNumber: input.rowNumber,
  })

  const columnCheck = state.columnChecks.get(input.analysis.id)
  if (columnCheck) columnCheck.resultCount += 1
}

function beginColumnChecks(
  state: SheetReadState,
  headerTextFor: (analysis: SoilCatalogAnalysis) => string | null
) {
  for (const analysis of state.sheetAnalyses) {
    state.columnChecks.set(analysis.id, {
      analysisId: analysis.id,
      reportTitle: analysis.reportTitle,
      sheetName: state.grid.name,
      column: analysis.excelValueColumn,
      headerText: headerTextFor(analysis),
      resultCount: 0,
    })
  }
}

function sortedRowNumbers(grid: SoilSheetGrid): number[] {
  return [...grid.rows.keys()].sort((left, right) => left - right)
}

function columnIndex(column: string): number {
  let index = 0
  for (const character of column.toUpperCase()) {
    index = index * 26 + (character.charCodeAt(0) - 64)
  }
  return index
}

function normalizeLayoutLabel(value: string): string {
  return value
    .normalize('NFC')
    .toLowerCase()
    .replace(/[áà]/g, 'a')
    .replace(/[éè]/g, 'e')
    .replace(/[íì]/g, 'i')
    .replace(/[óò]/g, 'o')
    .replace(/[úù]/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/%/g, ' ')
    .replace(/[()°º]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** "1762-2" es la muestra 1762, submuestra 2. Un número solo es la submuestra 1. */
function parseLabeledSample(cell: SoilCellPrimitive | undefined): LabeledSample | null {
  if (cell === null || cell === undefined) return null
  const text = String(cell).trim()
  const withSubsample = text.match(/^(\d+)\s*-\s*(\d+)$/)
  if (withSubsample) {
    const subsampleNumber = Number(withSubsample[2])
    return subsampleNumber > 0 ? { sampleCode: withSubsample[1], subsampleNumber } : null
  }
  const sampleCode = normalizeSampleCode(cell)
  return sampleCode ? { sampleCode, subsampleNumber: 1 } : null
}

function numericCell(cell: SoilCellPrimitive | undefined): number | null {
  const parsed = parseSoilCellValue(cell ?? null)
  if (parsed.kind !== 'numeric' || parsed.valueNumeric === null || parsed.qualifier) return null
  return parsed.valueNumeric
}

function categoryNumber(cell: SoilCellPrimitive | undefined): number | null {
  const value = numericCell(cell)
  if (value === null) return null
  const rounded = Math.round(value)
  return Math.abs(value - rounded) < 1e-6 ? rounded : null
}

function sameAperture(cell: SoilCellPrimitive | undefined, expected: string | null): boolean {
  if (!expected) return false
  const value = numericCell(cell)
  const expectedNumber = Number(expected.replace(',', '.'))
  if (value === null || !Number.isFinite(expectedNumber)) return false
  return Math.abs(value - expectedNumber) < 1e-6
}

function treatmentMatches(cell: SoilCellPrimitive | undefined, expected: string | null): boolean {
  if (!expected) return false
  const cellKey = normalizeDiscriminator(cell)
  const expectedKey = normalizeDiscriminator(expected)
  if (!cellKey || !expectedKey) return false
  return cellKey === expectedKey || cellKey.startsWith(expectedKey)
}

/**
 * Elige el análisis de la celda. La matriz no se guarda con el resultado.
 * Si varios análisis comparten valor y discriminador, la unidad de la celda desempata
 * cuando coincide exactamente con la del catálogo.
 */
function chooseAnalysis(
  candidates: SoilCatalogAnalysis[],
  row: Map<string, SoilCellPrimitive>
): SoilCatalogAnalysis | null {
  let pool = candidates
  if (pool.length > 1) {
    const unitColumn = pool.find((analysis) => analysis.excelUnitColumn)?.excelUnitColumn ?? null
    if (unitColumn) {
      const sourceUnit = normalizeUnitLabel(cellAsText(row.get(unitColumn)))
      const exactUnitMatches = pool.filter(
        (analysis) => analysis.unit !== null && normalizeUnitLabel(analysis.unit) === sourceUnit
      )
      if (exactUnitMatches.length > 0) pool = exactUnitMatches
    }
  }
  return pool.length === 1 ? pool[0] : null
}

function saveResolvedAnalyses(
  state: SheetReadState,
  input: {
    sampleCode: string
    subsampleNumber: number
    candidates: SoilCatalogAnalysis[]
    row: Map<string, SoilCellPrimitive>
    rowNumber: number
    basis: string | null
    cellFor?: (analysis: SoilCatalogAnalysis) => SoilCellPrimitive
    valueColumnFor?: (analysis: SoilCatalogAnalysis) => string
    rawValue?: string
  }
) {
  const groups = new Map<string, SoilCatalogAnalysis[]>()
  for (const analysis of input.candidates) {
    const groupKey = `${analysis.excelValueColumn}|${normalizeDiscriminator(analysis.excelDiscriminatorValue)}`
    const group = groups.get(groupKey) ?? []
    group.push(analysis)
    groups.set(groupKey, group)
  }

  for (const group of groups.values()) {
    const analysesWithValue = group.filter((analysis) => {
      const cell = input.cellFor ? input.cellFor(analysis) : (input.row.get(analysis.excelValueColumn) ?? null)
      return parseSoilCellValue(cell).kind !== 'empty'
    })
    if (analysesWithValue.length === 0) continue

    const chosen = chooseAnalysis(analysesWithValue, input.row)
    if (!chosen) {
      const titles = analysesWithValue.map((analysis) => analysis.reportTitle).join(', ')
      state.issues.push({
        severity: 'warning',
        code: 'ambiguous_analysis',
        sheetName: state.grid.name,
        rowNumber: input.rowNumber,
        message: `Muestra ${input.sampleCode}-${input.subsampleNumber}: hay más de un análisis para esta celda (${titles}).`,
      })
      continue
    }

    appendAnalysisResult(state, {
      sample: state.samplesByCode.get(input.sampleCode) ?? null,
      sampleCode: input.sampleCode,
      subsampleNumber: input.subsampleNumber,
      analysis: chosen,
      cell: input.cellFor ? input.cellFor(chosen) : (input.row.get(chosen.excelValueColumn) ?? null),
      valueColumn: input.valueColumnFor ? input.valueColumnFor(chosen) : chosen.excelValueColumn,
      basis: input.basis,
      rowNumber: input.rowNumber,
      row: input.row,
      rawValue: input.rawValue,
    })
  }
}

/** Tabla por filas: el encabezado está en headerRow y cada columna de valor es un análisis. */
function readRowTable(state: SheetReadState, layout: RowTableLayout, countIgnoredRow: () => void) {
  const headerRow = state.grid.rows.get(layout.headerRow)
  const headerHasData = !!headerRow && [...headerRow.values()].some((value) => cellAsText(value) !== null)
  if (!headerRow || !headerHasData) {
    const firstDataRow = firstRowWithData(state.grid)
    if (firstDataRow !== null) {
      state.issues.push({
        severity: 'error',
        code: 'header_not_in_row_1',
        sheetName: state.grid.name,
        rowNumber: firstDataRow,
        message: `La tabla no parte en la fila ${layout.headerRow}: el primer dato está en la fila ${firstDataRow}.`,
      })
    }
    return
  }

  if (cellAsText(headerRow.get('A')) === null) {
    state.issues.push({
      severity: 'warning',
      code: 'empty_header_a1',
      sheetName: state.grid.name,
      rowNumber: layout.headerRow,
      message: `La celda A${layout.headerRow} está vacía; se asume que la columna A es la muestra.`,
    })
  }

  for (const analysis of state.sheetAnalyses) {
    state.columnChecks.set(analysis.id, {
      analysisId: analysis.id,
      reportTitle: analysis.reportTitle,
      sheetName: state.grid.name,
      column: analysis.excelValueColumn,
      headerText: cellAsText(headerRow.get(analysis.excelValueColumn)),
      resultCount: 0,
    })
  }

  const basisColumn = findHeaderColumn(headerRow, 'peso inicial')
  const subsampleColumn = state.sheetAnalyses[0]?.excelSubsampleColumn ?? null
  const knownDiscriminators = new Set(
    state.sheetAnalyses
      .filter((analysis) => analysis.excelDiscriminatorColumn)
      .map((analysis) => normalizeDiscriminator(analysis.excelDiscriminatorValue))
  )
  const dataRowNumbers = [...state.grid.rows.keys()]
    .filter((rowNumber) => rowNumber > layout.headerRow)
    .sort((left, right) => left - right)

  for (const rowNumber of dataRowNumbers) {
    const row = state.grid.rows.get(rowNumber)!
    const sampleCell = row.get('A')
    const sampleCode = normalizeSampleCode(sampleCell)

    if (sampleCode === null) {
      if (cellAsText(sampleCell) !== null) countIgnoredRow()
      continue
    }

    const subsampleNumber = subsampleColumn ? parseSubsampleNumber(row.get(subsampleColumn)) : 1
    if (subsampleNumber === null) {
      state.issues.push({
        severity: 'error',
        code: 'missing_subsample',
        sheetName: state.grid.name,
        rowNumber,
        message: `Muestra ${sampleCode}: la columna ${subsampleColumn} no tiene un número de submuestra válido.`,
      })
      continue
    }

    const resolved = resolveRowAnalyses(state.sheetAnalyses, row, layout.discriminatorMatch)
    if (!resolved.matched) {
      const discriminatorColumn = resolved.discriminatorColumn ?? '?'
      const rowDiscriminatorText = cellAsText(row.get(discriminatorColumn)) ?? '(vacío)'
      state.issues.push({
        severity: 'error',
        code: 'unknown_discriminator',
        sheetName: state.grid.name,
        rowNumber,
        message: `Muestra ${sampleCode}-${subsampleNumber}: "${rowDiscriminatorText}" en la columna ${discriminatorColumn} no corresponde a ningún análisis del catálogo (${[...knownDiscriminators].join(', ')}).`,
      })
      continue
    }

    saveResolvedAnalyses(state, {
      sampleCode,
      subsampleNumber,
      candidates: resolved.analyses,
      row,
      rowNumber,
      basis: basisColumn ? normalizeBasis(row.get(basisColumn)) : null,
    })
  }
}

function resolveRowAnalyses(
  analyses: SoilCatalogAnalysis[],
  row: Map<string, SoilCellPrimitive>,
  matchMode: RowTableLayout['discriminatorMatch']
): { matched: boolean; analyses: SoilCatalogAnalysis[]; discriminatorColumn: string | null } {
  const discriminatorColumns = analyses
    .map((analysis) => analysis.excelDiscriminatorColumn)
    .filter((column): column is string => !!column)
  if (discriminatorColumns.length === 0) return { matched: true, analyses, discriminatorColumn: null }

  const matches = analyses.filter((analysis) => {
    if (!analysis.excelDiscriminatorColumn) return true
    return discriminatorMatches(row.get(analysis.excelDiscriminatorColumn), analysis.excelDiscriminatorValue, matchMode)
  })
  const discriminatorMatchesAny = matches.some((analysis) => analysis.excelDiscriminatorColumn)
  if (!discriminatorMatchesAny) {
    return { matched: false, analyses: [], discriminatorColumn: discriminatorColumns[0] }
  }

  if (matchMode !== 'prefix') return { matched: true, analyses: matches, discriminatorColumn: discriminatorColumns[0] }

  const longest = matches.reduce((length, analysis) => {
    if (!analysis.excelDiscriminatorColumn) return length
    return Math.max(length, normalizeDiscriminator(analysis.excelDiscriminatorValue).length)
  }, 0)
  return {
    matched: true,
    analyses: matches.filter(
      (analysis) =>
        !analysis.excelDiscriminatorColumn ||
        normalizeDiscriminator(analysis.excelDiscriminatorValue).length === longest
    ),
    discriminatorColumn: discriminatorColumns[0],
  }
}

function discriminatorMatches(
  cell: SoilCellPrimitive | undefined,
  expected: string | null,
  matchMode: RowTableLayout['discriminatorMatch']
): boolean {
  if (matchMode === 'prefix') return treatmentMatches(cell, expected)
  return normalizeDiscriminator(cell) === normalizeDiscriminator(expected)
}

/** Bloques por muestra: el código va junto a "Muestra", la apertura en B y el % retenido en F. */
function readParticleSizeBlocks(state: SheetReadState) {
  const headerRow = sortedRowNumbers(state.grid)
    .map((rowNumber) => state.grid.rows.get(rowNumber))
    .find((row) => row && normalizeLayoutLabel(cellAsText(row.get('B')) ?? '').startsWith('apertura'))
  beginColumnChecks(state, () => (headerRow ? cellAsText(headerRow.get('F')) : null))

  let labeledSample: LabeledSample | null = null
  let insideTable = false

  for (const rowNumber of sortedRowNumbers(state.grid)) {
    const row = state.grid.rows.get(rowNumber)!
    const label = normalizeLayoutLabel(cellAsText(row.get('A')) ?? '')

    if (label === 'muestra') {
      labeledSample = parseLabeledSample(row.get('B'))
      insideTable = false
      continue
    }
    if (label.startsWith('peso muestra')) continue
    if (label.includes('tamiz') || normalizeLayoutLabel(cellAsText(row.get('B')) ?? '').startsWith('apertura')) {
      insideTable = true
      continue
    }
    if (!labeledSample || !insideTable || numericCell(row.get('B')) === null) continue

    const matchingAnalyses = state.sheetAnalyses.filter((analysis) =>
      sameAperture(row.get('B'), analysis.excelDiscriminatorValue)
    )
    if (matchingAnalyses.length === 0) {
      const knownApertures = state.sheetAnalyses
        .map((analysis) => analysis.excelDiscriminatorValue)
        .filter((value): value is string => !!value)
      state.issues.push({
        severity: 'error',
        code: 'unknown_discriminator',
        sheetName: state.grid.name,
        rowNumber,
        message: `Muestra ${labeledSample.sampleCode}-${labeledSample.subsampleNumber}: la apertura "${cellAsText(row.get('B'))}" no corresponde a ningún tamiz del catálogo (${knownApertures.join(', ')}).`,
      })
      continue
    }

    saveResolvedAnalyses(state, {
      sampleCode: labeledSample.sampleCode,
      subsampleNumber: labeledSample.subsampleNumber,
      candidates: matchingAnalyses,
      row,
      rowNumber,
      basis: null,
    })
  }
}

function matchingTransposedSection(label: string, sections: TransposedSection[]): TransposedSection | null {
  const normalized = normalizeLayoutLabel(label)
  const hits = sections.filter((section) => normalized.includes(normalizeLayoutLabel(section.match)))
  hits.sort(
    (left, right) => normalizeLayoutLabel(right.match).length - normalizeLayoutLabel(left.match).length
  )
  return hits[0] ?? null
}

/** La fila de título identifica las muestras y la columna A el análisis. Hay un bloque por sección. */
function readHumicSubstances(state: SheetReadState, sections: TransposedSection[]) {
  beginColumnChecks(state, (analysis) => analysis.excelDiscriminatorValue)
  const sampleColumns = new Map<string, LabeledSample>()
  let basis: 'base_humeda' | 'base_seca' | null = null

  for (const rowNumber of sortedRowNumbers(state.grid)) {
    const row = state.grid.rows.get(rowNumber)!
    const label = cellAsText(row.get('A'))
    if (!label) continue

    const section = matchingTransposedSection(label, sections)
    if (section) {
      basis = section.basis
      const columns = [...row.keys()].sort((left, right) => columnIndex(left) - columnIndex(right))
      for (const column of columns) {
        if (column === 'A') continue
        const labeledSample = parseLabeledSample(row.get(column))
        if (labeledSample) sampleColumns.set(column, labeledSample)
      }
      continue
    }
    if (!basis) continue

    const basisLabel = basis === 'base_humeda' ? 'base humeda' : 'base seca'
    const fractionAnalyses = state.sheetAnalyses.filter(
      (analysis) =>
        normalizeLayoutLabel(analysis.excelDiscriminatorValue ?? '') === normalizeLayoutLabel(label) &&
        normalizeLayoutLabel(analysis.methodLabel ?? '') === basisLabel
    )
    if (fractionAnalyses.length === 0) continue

    const columns = [...sampleColumns.keys()].sort((left, right) => columnIndex(left) - columnIndex(right))
    for (const column of columns) {
      const labeledSample = sampleColumns.get(column)!
      const cell = row.get(column) ?? null
      if (parseSoilCellValue(cell).kind === 'empty') continue

      saveResolvedAnalyses(state, {
        sampleCode: labeledSample.sampleCode,
        subsampleNumber: labeledSample.subsampleNumber,
        candidates: fractionAnalyses,
        row,
        rowNumber,
        basis,
        cellFor: () => cell,
        valueColumnFor: () => column,
      })
    }
  }
}

/** El número de categoría va con su descripción: la de la fila, o la de la tabla lateral si la celda está vacía. */
function readOdorSheet(state: SheetReadState, layout: CodedLookupLayout) {
  const headerRow = state.grid.rows.get(1)
  beginColumnChecks(state, () => (headerRow ? cellAsText(headerRow.get(layout.categoryColumn)) : null))

  const descriptionByCategory = new Map<number, string>()
  for (const rowNumber of sortedRowNumbers(state.grid)) {
    const row = state.grid.rows.get(rowNumber)!
    if (parseLabeledSample(row.get('A'))) continue
    const category = categoryNumber(row.get(layout.lookupKeyColumn))
    const description = cellAsText(row.get(layout.lookupTextColumn))
    if (category === null || !description) continue
    descriptionByCategory.set(category, description)
  }

  for (const rowNumber of sortedRowNumbers(state.grid)) {
    const row = state.grid.rows.get(rowNumber)!
    const labeledSample = parseLabeledSample(row.get('A'))
    if (!labeledSample) continue

    const category = categoryNumber(row.get(layout.categoryColumn))
    const ownDescription = cellAsText(row.get(layout.overrideColumn))
    const lookupDescription = category === null ? null : descriptionByCategory.get(category)
    const description = ownDescription ?? lookupDescription ?? null
    if (description === null || category === null) {
      const categoryText = cellAsText(row.get(layout.categoryColumn)) ?? '(vacío)'
      const knownCategories = [...descriptionByCategory.keys()].sort((left, right) => left - right).join(', ')
      state.issues.push({
        severity: 'error',
        code: 'unknown_discriminator',
        sheetName: state.grid.name,
        rowNumber,
        message: `Muestra ${labeledSample.sampleCode}-${labeledSample.subsampleNumber}: la categoría "${categoryText}" no está en la tabla de olor (${knownCategories}).`,
      })
      continue
    }

    const categoryText = cellAsText(row.get(layout.categoryColumn)) ?? String(category)
    saveResolvedAnalyses(state, {
      sampleCode: labeledSample.sampleCode,
      subsampleNumber: labeledSample.subsampleNumber,
      candidates: state.sheetAnalyses,
      row,
      rowNumber,
      basis: null,
      cellFor: () => `${categoryText} — ${description}`,
      valueColumnFor: () => layout.categoryColumn,
      rawValue: categoryText,
    })
  }
}
