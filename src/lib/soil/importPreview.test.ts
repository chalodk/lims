import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSoilImportPreview,
  type RegisteredSoilSample,
  type SoilCatalogAnalysis,
  type SoilCellPrimitive,
  type SoilSheetGrid,
} from './importPreview'

const SUELO = 'matrix-suelo'
const AGUA = 'matrix-agua'
const LIQUIDO = 'matrix-liquido'

function sheet(name: string, rows: Record<number, Record<string, SoilCellPrimitive>>): SoilSheetGrid {
  return {
    name,
    rows: new Map(
      Object.entries(rows).map(([rowNumber, cells]) => [Number(rowNumber), new Map(Object.entries(cells))])
    ),
  }
}

function analysis(overrides: Partial<SoilCatalogAnalysis> & Pick<SoilCatalogAnalysis, 'id' | 'excelSheet' | 'excelValueColumn'>): SoilCatalogAnalysis {
  return {
    reportTitle: overrides.id,
    unit: null,
    resultKind: 'numeric',
    excelDiscriminatorColumn: null,
    excelDiscriminatorValue: null,
    excelUnitColumn: null,
    excelSubsampleColumn: 'B',
    methodLabel: null,
    matrixIds: [SUELO],
    ...overrides,
  }
}

function sample(overrides: Partial<RegisteredSoilSample> & Pick<RegisteredSoilSample, 'code' | 'requestedAnalysisIds'>): RegisteredSoilSample {
  return {
    id: `sample-${overrides.code}`,
    matrixId: SUELO,
    subsamples: [],
    ...overrides,
  }
}

const phHeader = { A: 'Muestra ', B: 'Nº Muestra', C: 'pH', D: 'Razón extracción ', I: 'Peso inicial' }
const phCatalog = [
  analysis({ id: 'ph-1-2.5', excelSheet: 'pH', excelValueColumn: 'C', excelDiscriminatorColumn: 'D', excelDiscriminatorValue: '1:2,5' }),
  analysis({ id: 'ph-1-5', excelSheet: 'pH', excelValueColumn: 'C', excelDiscriminatorColumn: 'D', excelDiscriminatorValue: '1:5' }),
]

describe('buildSoilImportPreview', () => {
  it('plans one result per subsample using the discriminator column', () => {
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('pH', {
          1: phHeader,
          2: { A: 1767, B: 1, C: 7.13, D: '1:2,5', I: 'Base seca' },
          3: { A: 1767, B: 2, C: 7.31, D: '1:2,5', I: 'Base seca' },
        }),
      ],
      catalog: phCatalog,
      samples: [sample({ code: '1767', requestedAnalysisIds: ['ph-1-2.5'], subsamples: [{ id: 'sub-1', number: 1 }] })],
    })

    assert.equal(preview.hasErrors, false)
    assert.equal(preview.results.length, 2)
    assert.deepEqual(
      preview.results.map((result) => [result.subsampleNumber, result.subsampleId, result.analysisId, result.valueNumeric, result.basis]),
      [
        [1, 'sub-1', 'ph-1-2.5', 7.13, 'base_seca'],
        [2, null, 'ph-1-2.5', 7.31, 'base_seca'],
      ]
    )
    assert.equal(preview.columnChecks[0].headerText, 'pH')
  })

  it('reports a discriminator that is not in the catalog', () => {
    const preview = buildSoilImportPreview({
      sheets: [sheet('pH', { 1: phHeader, 2: { A: 1767, B: 1, C: 7.3, D: 'Hasta saturación' } })],
      catalog: phCatalog,
      samples: [sample({ code: '1767', requestedAnalysisIds: ['ph-1-2.5'] })],
    })
    assert.equal(preview.hasErrors, true)
    assert.equal(preview.issues[0].code, 'unknown_discriminator')
    assert.equal(preview.issues[0].rowNumber, 2)
  })

  it('reports a table that does not start in row 1, with the first data row', () => {
    const preview = buildSoilImportPreview({
      sheets: [sheet('Hoja sin encabezado', { 3: { A: 'Muestra', B: 1538 }, 4: { A: 'Peso muestra', B: 500 } })],
      catalog: [analysis({ id: 'particle', excelSheet: 'Hoja sin encabezado', excelValueColumn: 'F' })],
      samples: [],
    })
    assert.deepEqual(
      preview.issues.map((issue) => [issue.code, issue.rowNumber]),
      [['header_not_in_row_1', 3]]
    )
  })

  it('matches sheet names ignoring surrounding spaces and case', () => {
    const preview = buildSoilImportPreview({
      sheets: [sheet(' Al extractable', { 1: { A: 'N° Muestra', N: 'mg Al / Kg' }, 2: { A: 1766, B: 1, N: 4.3 } })],
      catalog: [analysis({ id: 'al', excelSheet: 'Al extractable', excelValueColumn: 'N' })],
      samples: [sample({ code: '1766', requestedAnalysisIds: ['al'] })],
    })
    assert.equal(preview.results.length, 1)
    assert.equal(preview.results[0].sheetName, ' Al extractable')
  })

  it('does not error when a catalog sheet is absent from the workbook', () => {
    const preview = buildSoilImportPreview({
      sheets: [],
      catalog: [analysis({ id: 'zn', excelSheet: 'Zn total', excelValueColumn: 'N' })],
      samples: [sample({ code: '1804', requestedAnalysisIds: ['zn'] })],
    })
    assert.equal(preview.issues.length, 0)
    assert.equal(preview.results.length, 0)
  })

  it('reports the same sample and subsample twice in a sheet', () => {
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('B extractable', {
          1: { A: 'N° Muestra', J: 'mg B/ Kg' },
          2: { A: 1766, B: 1, J: 1.38 },
          3: { A: 1766, B: 1, J: 0.76 },
        }),
      ],
      catalog: [analysis({ id: 'b', excelSheet: 'B extractable', excelValueColumn: 'J' })],
      samples: [sample({ code: '1766', requestedAnalysisIds: ['b'] })],
    })
    assert.equal(preview.results.length, 1)
    assert.equal(preview.results[0].valueNumeric, 1.38)
    assert.equal(preview.hasErrors, false)
    assert.equal(preview.issues[0].code, 'duplicate_row')
    assert.equal(preview.issues[0].severity, 'warning')
    assert.match(preview.issues[0].message, /fila 2/)
  })

  it('skips template rows and plans a sample for codes that are not registered', () => {
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('CIC', {
          1: { A: 'Muestra', M: 'CIC cmol/ kg Na' },
          2: { A: 'Sol. saturante ', M: 0 },
          3: { A: 1771, B: 1, M: 30.59 },
          4: { G: '#DIV/0!' },
          5: { A: 1605, B: 1, M: 12 },
        }),
      ],
      catalog: [analysis({ id: 'cic', excelSheet: 'CIC', excelValueColumn: 'M' })],
      samples: [sample({ code: '1771', requestedAnalysisIds: ['cic'] })],
    })
    assert.equal(preview.hasErrors, false)
    assert.deepEqual(
      preview.results.map((result) => [result.sampleCode, result.createsSample, result.valueNumeric]),
      [
        ['1771', false, 30.59],
        ['1605', true, 12],
      ]
    )
    assert.equal(preview.ignoredRowCount, 1)
    assert.deepEqual(preview.newSampleCodes, ['1605'])
  })

  it('reports formula errors and text in numeric columns for registered samples', () => {
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('Mo Total', {
          1: { A: 'N° Muestra', N: 'mg Al / Kg' },
          2: { A: 1746, B: 1, N: '#VALUE!' },
          3: { A: 1746, B: 2, N: 'sin muestra' },
        }),
      ],
      catalog: [analysis({ id: 'mo', excelSheet: 'Mo Total', excelValueColumn: 'N' })],
      samples: [sample({ code: '1746', requestedAnalysisIds: ['mo'] })],
    })
    assert.deepEqual(
      preview.issues.map((issue) => issue.code),
      ['formula_error', 'text_in_numeric']
    )
  })

  it('reads 10ⁿ and censored values as numeric', () => {
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('Coliformes ', {
          1: { A: 'Muestras ', D: 'coliformes totales', E: 'coliformes fecales' },
          2: { A: 1762, B: 1, D: '<3', E: '2,6*10⁵' },
        }),
      ],
      catalog: [
        analysis({ id: 'totales', excelSheet: 'Coliformes', excelValueColumn: 'D' }),
        analysis({ id: 'fecales', excelSheet: 'Coliformes', excelValueColumn: 'E' }),
      ],
      samples: [sample({ code: '1762', requestedAnalysisIds: ['totales', 'fecales'] })],
    })
    assert.deepEqual(
      preview.results.map((result) => [result.analysisId, result.valueNumeric, result.valueQualifier]),
      [
        ['totales', 3, '<'],
        ['fecales', 260000, null],
      ]
    )
  })

  it('picks the catalog entry by sample matrix and converts the unit column', () => {
    const catalog = [
      analysis({ id: 'ce-suelo', excelSheet: 'Conductividad eléctrica', excelValueColumn: 'C', excelDiscriminatorColumn: 'E', excelDiscriminatorValue: '1:2,5', excelUnitColumn: 'D', unit: 'dS/m', matrixIds: [SUELO] }),
      analysis({ id: 'ce-agua', excelSheet: 'Conductividad eléctrica', excelValueColumn: 'C', excelDiscriminatorColumn: 'E', excelDiscriminatorValue: 'directo', excelUnitColumn: 'D', unit: 'μS/cm', matrixIds: [AGUA] }),
    ]
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('Conductividad eléctrica', {
          1: { A: 'Muestra ', C: 'CE ', D: 'unidad CE', E: 'muestra:H2O' },
          2: { A: 1766, B: 1, C: 440, D: 'µS/cm', E: '1:2,5' },
          3: { A: 1900, B: 1, C: 320, D: 'µS/cm', E: 'directo' },
          4: { A: 1766, B: 2, C: 450, D: 'mg/L', E: '1:2,5' },
        }),
      ],
      catalog,
      samples: [
        sample({ code: '1766', requestedAnalysisIds: ['ce-suelo'] }),
        sample({ code: '1900', matrixId: AGUA, requestedAnalysisIds: ['ce-agua'] }),
      ],
    })
    assert.deepEqual(
      preview.results.map((result) => [result.sampleCode, result.analysisId, result.valueNumeric]),
      [
        ['1766', 'ce-suelo', 0.44],
        ['1900', 'ce-agua', 320],
      ]
    )
    assert.deepEqual(preview.issues.map((issue) => issue.code), ['unknown_unit'])
  })

  it('saves the cell when the sample did not request the analysis and the analysis has one matrix', () => {
    const preview = buildSoilImportPreview({
      sheets: [sheet('N total', { 1: { A: 'Muestra ', D: 'N total' }, 2: { A: 1605, B: 8, D: 1.19 } })],
      catalog: [analysis({ id: 'n', excelSheet: 'N total', excelValueColumn: 'D' })],
      samples: [sample({ code: '1605', requestedAnalysisIds: [] })],
    })
    assert.equal(preview.hasErrors, false)
    assert.equal(preview.issues.length, 0)
    assert.deepEqual(
      preview.results.map((result) => [result.analysisId, result.valueNumeric, result.createsSample]),
      [['n', 1.19, false]]
    )
  })

  it('uses subsample 1 for sheets without a subsample column', () => {
    const preview = buildSoilImportPreview({
      sheets: [sheet('germinación de maleza ', { 1: { A: 'Muestra', B: '%maleza ' }, 2: { A: 1811, B: 0, C: 'Base humeda' } })],
      catalog: [analysis({ id: 'malezas', excelSheet: 'germinación de maleza', excelValueColumn: 'B', excelSubsampleColumn: null })],
      samples: [sample({ code: '1811', requestedAnalysisIds: ['malezas'] })],
    })
    assert.equal(preview.hasErrors, false)
    assert.deepEqual(
      preview.results.map((result) => [result.subsampleNumber, result.valueNumeric]),
      [[1, 0]]
    )
  })

  it('reports a row without a valid subsample number', () => {
    const preview = buildSoilImportPreview({
      sheets: [sheet('Hongos Filamentosos', { 1: { A: 'Muestras ', D: 'Valor ' }, 2: { A: 1628, B: '-', D: '<1*10³ ' } })],
      catalog: [analysis({ id: 'hongos', excelSheet: 'Hongos Filamentosos', excelValueColumn: 'D' })],
      samples: [sample({ code: '1628', requestedAnalysisIds: ['hongos'] })],
    })
    assert.equal(preview.issues[0].code, 'missing_subsample')
  })

  it('keeps a valid row when the next row has an invalid subsample', () => {
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('Hongos Filamentosos', {
          1: { A: 'Muestras ', D: 'Valor ' },
          2: { A: 1628, B: 1, D: 12 },
          3: { A: 1628, B: '1a', D: 8 },
        }),
      ],
      catalog: [analysis({ id: 'hongos', excelSheet: 'Hongos Filamentosos', excelValueColumn: 'D' })],
      samples: [sample({ code: '1628', requestedAnalysisIds: ['hongos'] })],
    })
    assert.equal(preview.hasErrors, true)
    assert.deepEqual(
      preview.results.map((result) => [result.sampleCode, result.subsampleNumber, result.valueNumeric]),
      [['1628', 1, 12]]
    )
    assert.equal(preview.issues[0].code, 'missing_subsample')
    assert.equal(preview.issues[0].severity, 'error')
    assert.equal(preview.issues[0].rowNumber, 3)
  })

  it('warns on an empty A1 but still reads the sheet', () => {
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('Clorofila', {
          1: { A: ' ', B: 'N° muestra', C: 'Tipo de clorofila', N: 'Promedio' },
          2: { A: 1779, B: 1, C: 'A', N: 26.18 },
          3: { A: 1779, B: 1, C: 'B', N: 9.72 },
        }),
      ],
      catalog: [
        analysis({ id: 'clorofila-a', excelSheet: 'Clorofila', excelValueColumn: 'N', excelDiscriminatorColumn: 'C', excelDiscriminatorValue: 'A' }),
        analysis({ id: 'clorofila-b', excelSheet: 'Clorofila', excelValueColumn: 'N', excelDiscriminatorColumn: 'C', excelDiscriminatorValue: 'B' }),
      ],
      samples: [sample({ code: '1779', requestedAnalysisIds: ['clorofila-a', 'clorofila-b'] })],
    })
    assert.equal(preview.hasErrors, false)
    assert.equal(preview.issues[0].code, 'empty_header_a1')
    assert.deepEqual(
      preview.results.map((result) => [result.analysisId, result.valueNumeric]),
      [
        ['clorofila-a', 26.18],
        ['clorofila-b', 9.72],
      ]
    )
  })

  it('reads CaCO3 from column J starting at row 26 and ignores earlier rows', () => {
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('CaCO3 Eq', {
          1: { A: 'Muestra', J: '% CaCO3' },
          9: { A: 1774, J: 87.83 },
          26: { A: 'Muestra', J: 'CaCO3 BS' },
          27: { A: 1793, J: 1.22 },
        }),
      ],
      catalog: [
        analysis({
          id: 'caco3',
          excelSheet: 'CaCO3 Eq',
          excelValueColumn: 'J',
          excelSubsampleColumn: null,
          matrixIds: [SUELO],
        }),
      ],
      samples: [],
    })

    assert.equal(preview.hasErrors, false)
    assert.deepEqual(preview.newSampleCodes, ['1793'])
    assert.deepEqual(
      preview.results.map((result) => [result.sampleCode, result.valueNumeric, result.createsSample]),
      [['1793', 1.22, true]]
    )
  })

  it('reads pH and conductivity at saturation as their own analyses', () => {
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('pH', {
          1: phHeader,
          2: { A: 1767, B: 1, C: 7.13, D: '1:2,5' },
          3: { A: 1767, B: 1, C: 7.31, D: 'Hasta saturación' },
        }),
        sheet('Conductividad eléctrica', {
          1: { A: 'Muestra ', C: 'CE ', D: 'unidad CE', E: 'muestra:H2O' },
          2: { A: 1767, B: 1, C: 1000, D: 'µS/cm', E: 'Hasta saturación' },
        }),
      ],
      catalog: [
        ...phCatalog,
        analysis({
          id: 'ph-saturacion',
          excelSheet: 'pH',
          excelValueColumn: 'C',
          excelDiscriminatorColumn: 'D',
          excelDiscriminatorValue: 'Hasta saturación',
        }),
        analysis({
          id: 'ce-saturacion',
          excelSheet: 'Conductividad eléctrica',
          excelValueColumn: 'C',
          excelDiscriminatorColumn: 'E',
          excelDiscriminatorValue: 'Hasta saturación',
          excelUnitColumn: 'D',
          unit: 'dS/m',
        }),
      ],
      samples: [sample({ code: '1767', requestedAnalysisIds: ['ph-1-2.5', 'ph-saturacion', 'ce-saturacion'] })],
    })

    assert.equal(preview.hasErrors, false)
    assert.deepEqual(
      preview.results.map((result) => [result.analysisId, result.valueNumeric]),
      [
        ['ph-1-2.5', 7.13],
        ['ph-saturacion', 7.31],
        ['ce-saturacion', 1],
      ]
    )
  })

  it('splits radish germination into direct and diluted, both as subsample 1', () => {
    const catalog = [
      analysis({
        id: 'rabanito-directo',
        excelSheet: 'Rabanitos',
        excelValueColumn: 'C',
        excelDiscriminatorColumn: 'B',
        excelDiscriminatorValue: 'directo',
        excelSubsampleColumn: null,
        methodLabel: 'Directo',
      }),
      analysis({
        id: 'rabanito-diluido',
        excelSheet: 'Rabanitos',
        excelValueColumn: 'C',
        excelDiscriminatorColumn: 'B',
        excelDiscriminatorValue: 'dil',
        excelSubsampleColumn: null,
        methodLabel: 'Diluido',
      }),
    ]
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('Rabanitos ', {
          1: { A: 'Muestra', B: 'Muestras', C: '% Germinación rabanitos ', D: 'Peso inicial' },
          2: { A: 1737, B: 'Directo', C: 0.9, D: 'Base seca' },
          3: { A: 1737, B: 'Dil (60 ul en 1000 ml)', C: 0.6, D: 'Base seca' },
          4: { A: 1737, B: 'Otro', C: 0.1 },
        }),
      ],
      catalog,
      samples: [sample({ code: '1737', requestedAnalysisIds: ['rabanito-directo', 'rabanito-diluido'] })],
    })

    assert.deepEqual(
      preview.results.map((result) => [result.analysisId, result.subsampleNumber, result.valueNumeric, result.basis]),
      [
        ['rabanito-directo', 1, 0.9, 'base_seca'],
        ['rabanito-diluido', 1, 0.6, 'base_seca'],
      ]
    )
    assert.equal(preview.issues[0].code, 'unknown_discriminator')
    assert.equal(preview.issues[0].rowNumber, 4)
  })

  it('stores the odor description and keeps the category as the raw value', () => {
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('Olor ', {
          1: { A: 'Muestra', B: 'Categoria ', G: 'Tabla TMECC' },
          2: { A: 1811, B: 2, G: 'Categoria olor', H: 'Descripción ' },
          3: { G: 1, H: 'Terroso, con olor a tierra' },
          4: { G: 2, H: 'Mohoso, a humedad, a moho' },
          5: { A: 1811, B: 9 },
        }),
      ],
      catalog: [
        analysis({
          id: 'olor',
          excelSheet: 'Olor',
          excelValueColumn: 'B',
          excelSubsampleColumn: null,
          resultKind: 'text',
        }),
      ],
      samples: [sample({ code: '1811', requestedAnalysisIds: ['olor'] })],
    })

    assert.equal(preview.results.length, 1)
    assert.equal(preview.results[0].valueText, '2 — Mohoso, a humedad, a moho')
    assert.equal(preview.results[0].rawValue, '2')
    assert.equal(preview.results[0].valueNumeric, null)
    assert.equal(preview.issues[0].code, 'unknown_discriminator')
    assert.equal(preview.issues[0].rowNumber, 5)
  })

  it('reads humic substances transposed, one result per fraction and basis', () => {
    const humic = (id: string, fraction: string, basis: string) =>
      analysis({
        id,
        excelSheet: 'Sustancias húmicas',
        excelValueColumn: 'A',
        excelDiscriminatorColumn: 'A',
        excelDiscriminatorValue: fraction,
        excelSubsampleColumn: null,
        methodLabel: basis,
        unit: '%',
      })
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('Sustancias húmicas', {
          1: { A: '% Base húmeda', F: '1687-1', G: '1687-2' },
          2: { A: 'Extracto húmico total (%)', F: 3.8, G: 5.3 },
          3: { A: 'Ácidos fúlvicos (%)', F: 3.4, G: 4.5 },
          4: { A: 'total fracciones (%)', F: 7.2 },
          5: { A: '% Base seca', G: '1687-2' },
          6: { A: 'Extracto húmico total (%)', F: 3.9, G: 5.4 },
        }),
      ],
      catalog: [
        humic('eht-humeda', 'Extracto húmico total', 'Base húmeda'),
        humic('fulvicos-humeda', 'Ácidos fúlvicos', 'Base húmeda'),
        humic('eht-seca', 'Extracto húmico total', 'Base seca'),
      ],
      samples: [
        sample({ code: '1687', requestedAnalysisIds: ['eht-humeda', 'fulvicos-humeda', 'eht-seca'] }),
      ],
    })

    assert.equal(preview.hasErrors, false)
    assert.deepEqual(
      preview.results.map((result) => [result.analysisId, result.subsampleNumber, result.valueNumeric, result.basis]),
      [
        ['eht-humeda', 1, 3.8, 'base_humeda'],
        ['eht-humeda', 2, 5.3, 'base_humeda'],
        ['fulvicos-humeda', 1, 3.4, 'base_humeda'],
        ['fulvicos-humeda', 2, 4.5, 'base_humeda'],
        ['eht-seca', 1, 3.9, 'base_seca'],
        ['eht-seca', 2, 5.4, 'base_seca'],
      ]
    )
  })

  it('reads particle-size blocks that do not start in row 1', () => {
    const sieve = (id: string, aperture: string) =>
      analysis({
        id,
        excelSheet: 'Tamaño de partícula',
        excelValueColumn: 'F',
        excelDiscriminatorColumn: 'B',
        excelDiscriminatorValue: aperture,
        excelSubsampleColumn: null,
        unit: '% retenido',
      })
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('Tamaño de partícula', {
          3: { A: 'Muestra', B: 1538 },
          4: { A: 'Peso muestra', B: 500 },
          5: { A: 'N° Tamiz', B: 'Apertura (mm)', F: '% Retenido' },
          6: { A: 4, B: 4.75, F: 0.04 },
          7: { A: 10, B: 2, F: 0.06 },
          8: { A: 'Bandeja', B: '-', F: 15.3 },
          9: { A: 12, B: 1.7, F: 0.92 },
          14: { A: 'Muestra', B: '1762-2' },
          16: { A: 'N° Tamiz', B: 'Apertura (mm)', F: '% Retenido' },
          17: { A: 4, B: 4.75, F: 0 },
        }),
      ],
      catalog: [sieve('tamiz-475', '4.75'), sieve('tamiz-2', '2')],
      samples: [sample({ code: '1538', requestedAnalysisIds: ['tamiz-475', 'tamiz-2'] }), sample({ code: '1762', requestedAnalysisIds: ['tamiz-475'] })],
    })

    assert.equal(preview.issues.some((issue) => issue.code === 'header_not_in_row_1'), false)
    assert.deepEqual(
      preview.results.map((result) => [result.sampleCode, result.subsampleNumber, result.analysisId, result.valueNumeric]),
      [
        ['1538', 1, 'tamiz-475', 0.04],
        ['1538', 1, 'tamiz-2', 0.06],
        ['1762', 2, 'tamiz-475', 0],
      ]
    )
    assert.equal(preview.issues[0].code, 'unknown_discriminator')
    assert.equal(preview.issues[0].rowNumber, 9)
  })

  it('keeps one conductivity analysis for direct water and liquid, in microsiemens', () => {
    const catalog = [
      analysis({
        id: 'ce-directo',
        excelSheet: 'Conductividad eléctrica',
        excelValueColumn: 'C',
        excelDiscriminatorColumn: 'E',
        excelDiscriminatorValue: 'directo',
        excelUnitColumn: 'D',
        unit: 'μS/cm',
        matrixIds: [AGUA, LIQUIDO],
      }),
    ]
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('Conductividad eléctrica', {
          1: { A: 'Muestra ', C: 'CE ', D: 'unidad CE', E: 'muestra:H2O' },
          2: { A: 1900, B: 1, C: 320, D: 'µS/cm', E: 'directo' },
          3: { A: 1901, B: 1, C: 1.5, D: 'mS/cm', E: 'directo' },
        }),
      ],
      catalog,
      samples: [],
    })

    assert.equal(preview.hasErrors, false)
    assert.deepEqual(
      preview.results.map((result) => [result.sampleCode, result.analysisId, result.valueNumeric]),
      [
        ['1900', 'ce-directo', 320],
        ['1901', 'ce-directo', 1500],
      ]
    )
  })

  it('reads a soil 1:5 conductivity row as the soil analysis', () => {
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('Conductividad eléctrica', {
          1: { A: 'Muestra ', C: 'CE ', D: 'unidad CE', E: 'muestra:H2O' },
          2: { A: 1766, B: 1, C: 440, D: 'µS/cm', E: '1:5' },
          3: { A: 1800, B: 1, C: 2.5, D: 'mS/cm', E: '1:5' },
        }),
      ],
      catalog: [
        analysis({
          id: 'ce-suelo-1-5',
          excelSheet: 'Conductividad eléctrica',
          excelValueColumn: 'C',
          excelDiscriminatorColumn: 'E',
          excelDiscriminatorValue: '1:5',
          excelUnitColumn: 'D',
          unit: 'μS/cm',
          matrixIds: [SUELO],
        }),
        analysis({
          id: 'ce-compost-1-5',
          excelSheet: 'Conductividad eléctrica',
          excelValueColumn: 'C',
          excelDiscriminatorColumn: 'E',
          excelDiscriminatorValue: '1:5',
          excelUnitColumn: 'D',
          unit: 'mS/cm',
          matrixIds: ['matrix-compost'],
        }),
      ],
      samples: [],
    })

    assert.equal(preview.hasErrors, false)
    assert.deepEqual(
      preview.results.map((result) => [result.sampleCode, result.analysisId, result.valueNumeric]),
      [
        ['1766', 'ce-suelo-1-5', 440],
        ['1800', 'ce-compost-1-5', 2.5],
      ]
    )
  })

  it('reads calcium milligrams and centimoles as two columns of one title', () => {
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('Ca extractable', {
          1: { A: 'N° Muestra', B: 'N° submuestra', N: 'mg Ca / Kg', O: 'cmol/Kg' },
          2: { A: 1766, B: 1, N: 2369.58, O: 11.85 },
        }),
      ],
      catalog: [
        analysis({ id: 'ca-mg', reportTitle: 'Ca extractable', excelSheet: 'Ca extractable', excelValueColumn: 'N', unit: 'mg/Kg' }),
        analysis({ id: 'ca-cmol', reportTitle: 'Ca extractable', excelSheet: 'Ca extractable', excelValueColumn: 'O', unit: 'cmol+/Kg' }),
      ],
      samples: [sample({ code: '1766', requestedAnalysisIds: ['ca-mg', 'ca-cmol'] })],
    })

    assert.equal(preview.issues.some((issue) => issue.code === 'ambiguous_analysis'), false)
    assert.deepEqual(
      preview.results.map((result) => [result.analysisId, result.valueNumeric]),
      [
        ['ca-mg', 2369.58],
        ['ca-cmol', 11.85],
      ]
    )
  })

  it('reads viable and inviable helminth eggs from columns S and T', () => {
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('Huevos de helmintos ', {
          1: { A: 'ID de muestra', C: 'Submuestra', S: 'huevos viables/mL', T: 'Huevos inviables/mL' },
          2: { A: 1700, C: 1, S: 4, T: 1 },
        }),
      ],
      catalog: [
        analysis({ id: 'viables', excelSheet: 'Huevos de helmintos', excelValueColumn: 'S', excelSubsampleColumn: 'C', unit: 'huevos/mL' }),
        analysis({ id: 'inviables', excelSheet: 'Huevos de helmintos', excelValueColumn: 'T', excelSubsampleColumn: 'C', unit: 'huevos/mL' }),
      ],
      samples: [sample({ code: '1700', requestedAnalysisIds: ['viables', 'inviables'] })],
    })

    assert.equal(preview.hasErrors, false)
    assert.deepEqual(
      preview.results.map((result) => [result.analysisId, result.subsampleNumber, result.valueNumeric]),
      [
        ['viables', 1, 4],
        ['inviables', 1, 1],
      ]
    )
  })

  it('prefers the odor note in column E over the reference table', () => {
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('Olor', {
          1: { A: 'Muestra', B: 'Categoria', E: 'Descripción', G: 'Tabla TMECC' },
          2: { A: 1811, B: 2, E: 'Nota del analista' },
          3: { G: 2, H: 'Mohoso, a humedad, a moho' },
        }),
      ],
      catalog: [
        analysis({
          id: 'olor',
          excelSheet: 'Olor',
          excelValueColumn: 'B',
          excelSubsampleColumn: null,
          resultKind: 'text',
        }),
      ],
      samples: [sample({ code: '1811', requestedAnalysisIds: ['olor'] })],
    })

    assert.equal(preview.hasErrors, false)
    assert.equal(preview.results[0].valueText, '2 — Nota del analista')
    assert.equal(preview.results[0].rawValue, '2')
  })

  it('reads a humic carbon balance block with the same transposed layout', () => {
    const preview = buildSoilImportPreview({
      sheets: [
        sheet('Sustancias húmicas', {
          1: { A: '% Base húmeda', F: '1687-1' },
          2: { A: 'Extracto húmico total (%)', F: 3.8 },
          15: { A: 'Balance de C en el producto (Base húmeda)' },
          16: { A: 'C-Extracto húmico total (%)', F: 0.55 },
        }),
      ],
      catalog: [
        analysis({
          id: 'eht',
          excelSheet: 'Sustancias húmicas',
          excelValueColumn: 'A',
          excelDiscriminatorColumn: 'A',
          excelDiscriminatorValue: 'Extracto húmico total',
          excelSubsampleColumn: null,
          methodLabel: 'Base húmeda',
        }),
        analysis({
          id: 'c-eht',
          excelSheet: 'Sustancias húmicas',
          excelValueColumn: 'A',
          excelDiscriminatorColumn: 'A',
          excelDiscriminatorValue: 'C-Extracto húmico total',
          excelSubsampleColumn: null,
          methodLabel: 'Base húmeda',
        }),
      ],
      samples: [sample({ code: '1687', requestedAnalysisIds: ['eht', 'c-eht'] })],
    })

    assert.equal(preview.hasErrors, false)
    assert.deepEqual(
      preview.results.map((result) => [result.analysisId, result.valueNumeric, result.basis]),
      [
        ['eht', 3.8, 'base_humeda'],
        ['c-eht', 0.55, 'base_humeda'],
      ]
    )
  })

  it('saves a result when the analysis applies to more than one matrix', () => {
    const preview = buildSoilImportPreview({
      sheets: [sheet('N total', { 1: { A: 'Muestra', D: 'N total', F: 'Matriz' }, 2: { A: 1605, B: 1, D: 1.19, F: 'Agua' } })],
      catalog: [analysis({ id: 'n', excelSheet: 'N total', excelValueColumn: 'D', matrixIds: [SUELO, AGUA] })],
      samples: [],
    })

    assert.equal(preview.issues.length, 0)
    assert.equal(preview.results.length, 1)
    assert.equal(preview.results[0].analysisId, 'n')
    assert.equal(preview.results[0].valueNumeric, 1.19)
  })
})
