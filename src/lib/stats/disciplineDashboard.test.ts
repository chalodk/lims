import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildDisciplineDashboard,
  buildDisciplineDonutRows,
  countsAsPositiveDetection,
  isExcludedFromPositivity,
  monthKeyFromSample,
  parseDisciplineQuery,
  positivityPercent,
  prevalencePathogenName,
  resolveDiscipline,
  rollingSantiagoMonths,
  type DisciplineFindingInput,
} from './disciplineDashboard'

const SEPTEMBER_2026 = new Date('2026-09-15T15:00:00.000Z')

describe('parseDisciplineQuery', () => {
  it('accepts a database area and defaults the window to 6 months', () => {
    const parsed = parseDisciplineQuery({ area: 'nematologia', months: null })
    assert.equal(parsed.ok, true)
    if (!parsed.ok) return
    assert.equal(parsed.discipline.area, 'nematologia')
    assert.equal(parsed.months, 6)
  })

  it('accepts a canonical analysis key and a 12 month window', () => {
    const parsed = parseDisciplineQuery({ area: 'virology', months: '12' })
    assert.equal(parsed.ok, true)
    if (!parsed.ok) return
    assert.equal(parsed.discipline.area, 'virologia')
    assert.equal(parsed.months, 12)
  })

  it('rejects a missing area', () => {
    const parsed = parseDisciplineQuery({ area: '  ', months: '6' })
    assert.equal(parsed.ok, false)
    if (parsed.ok) return
    assert.equal(parsed.status, 400)
  })

  it('rejects an unknown area and an invalid window', () => {
    const unknownArea = parseDisciplineQuery({ area: 'suelos', months: '6' })
    const unknownWindow = parseDisciplineQuery({ area: 'fitopatologia', months: '3' })
    assert.equal(unknownArea.ok, false)
    assert.equal(unknownWindow.ok, false)
  })
})

describe('rollingSantiagoMonths', () => {
  it('returns six calendar months ending in the Santiago month', () => {
    const months = rollingSantiagoMonths(6, SEPTEMBER_2026)
    assert.deepEqual(
      months.map((month) => month.monthKey),
      ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']
    )
    assert.match(months[0]?.label ?? '', /^abr 2026$/)
    assert.match(months[5]?.label ?? '', /^sept 2026$/)
  })
})

describe('monthKeyFromSample', () => {
  it('uses the reception timestamp in America/Santiago', () => {
    assert.equal(
      monthKeyFromSample({ receivedAt: '2026-05-01T02:30:00.000Z', receivedDate: '2026-04-20' }),
      '2026-04'
    )
  })

  it('keeps a date-only reception in that calendar month', () => {
    assert.equal(monthKeyFromSample({ receivedAt: null, receivedDate: '2026-04-20' }), '2026-04')
  })
})

describe('positivity rules', () => {
  const nematology = resolveDiscipline('nematologia')
  const virology = resolveDiscipline('virologia')

  it('excludes only absence from positivity', () => {
    assert.equal(isExcludedFromPositivity('Sin presencia de nemátodos'), true)
    assert.equal(isExcludedFromPositivity('Nematodos no fitoparásitos (benéficos)'), false)
    assert.equal(isExcludedFromPositivity('No fitoparásitos'), false)
    assert.equal(isExcludedFromPositivity('Ditylenchus dipsaci'), false)
  })

  it('counts nematology presence, including non-phytoparasites, and skips absence', () => {
    assert.ok(nematology)
    const parasitic: DisciplineFindingInput = {
      resultId: 'r',
      sampleId: 's',
      testArea: 'nematologia',
      findingsType: 'nematologia_positive',
      pathogenName: 'Ditylenchus dipsaci',
      detectionResult: null,
    }
    const beneficial = {
      ...parasitic,
      findingsType: 'nematologia_negative',
      pathogenName: 'Nematodos no fitoparásitos (benéficos)',
    }
    const nonPhytoparasite = {
      ...parasitic,
      pathogenName: 'No fitoparásitos',
    }
    const absent = {
      ...parasitic,
      findingsType: 'nematologia_negative',
      pathogenName: 'Sin presencia de nemátodos',
    }
    assert.equal(countsAsPositiveDetection(parasitic, nematology!), true)
    assert.equal(countsAsPositiveDetection(beneficial, nematology!), true)
    assert.equal(countsAsPositiveDetection(nonPhytoparasite, nematology!), true)
    assert.equal(countsAsPositiveDetection(absent, nematology!), false)
  })

  it('counts other disciplines from detection_result', () => {
    assert.ok(virology)
    assert.equal(
      countsAsPositiveDetection(
        {
          findingsType: 'virologia',
          pathogenName: 'Apple stem grooving virus',
          detectionResult: 'positive',
        },
        virology!
      ),
      true
    )
    assert.equal(
      countsAsPositiveDetection(
        {
          findingsType: 'virologia',
          pathogenName: 'Apple stem grooving virus',
          detectionResult: 'negative',
        },
        virology!
      ),
      false
    )
  })

  it('rounds positivity to one decimal and returns 0 when there are no samples', () => {
    assert.equal(positivityPercent(185, 270), 68.5)
    assert.equal(positivityPercent(0, 0), 0)
  })
})

describe('buildDisciplineDonutRows', () => {
  it('always lists the five disciplines and merges alias keys', () => {
    const rows = buildDisciplineDonutRows([
      { typeKey: 'nematologia', label: 'Nematología', count: 2 },
      { typeKey: 'nematology', label: 'Nematológico', count: 3 },
      { typeKey: '__uncategorized__', label: 'Sin especificar', count: 1 },
    ])
    assert.equal(rows[0]?.typeKey, 'nematologia')
    assert.equal(rows[0]?.count, 5)
    assert.equal(rows[0]?.selectable, true)
    assert.equal(rows.find((row) => row.typeKey === 'bacteriologia')?.count, 0)
    assert.equal(rows.find((row) => row.typeKey === 'bacteriologia')?.selectable, true)
    const extra = rows.find((row) => row.typeKey === '__uncategorized__')
    assert.equal(extra?.count, 1)
    assert.equal(extra?.selectable, false)
  })
})

describe('buildDisciplineDashboard', () => {
  it('ranks detections and splits monthly samples from positives', () => {
    const discipline = resolveDiscipline('nematologia')
    assert.ok(discipline)
    const dashboard = buildDisciplineDashboard({
      discipline: discipline!,
      months: 6,
      referenceDate: SEPTEMBER_2026,
      samples: [
        { id: 's1', receivedAt: '2026-04-10T15:00:00.000Z', receivedDate: null },
        { id: 's2', receivedAt: null, receivedDate: '2026-04-20' },
        { id: 's3', receivedAt: '2026-05-10T15:00:00.000Z', receivedDate: null },
        { id: 's4', receivedAt: '2026-03-10T15:00:00.000Z', receivedDate: null },
        { id: 's5', receivedAt: '2026-04-11T15:00:00.000Z', receivedDate: null },
        { id: 's6', receivedAt: '2026-09-02T15:00:00.000Z', receivedDate: null },
      ],
      results: [
        { id: 'r1', sampleId: 's1', testArea: 'nematologia' },
        { id: 'r2', sampleId: 's2', testArea: 'nematologia' },
        { id: 'r3', sampleId: 's3', testArea: 'nematology' },
        { id: 'r4', sampleId: 's4', testArea: 'nematologia' },
        { id: 'r5', sampleId: 's5', testArea: 'virologia' },
        { id: 'r6', sampleId: 's6', testArea: 'nematologia' },
      ],
      findings: [
        {
          resultId: 'r1',
          sampleId: 's1',
          testArea: 'nematologia',
          findingsType: 'nematologia_positive',
          pathogenName: 'Ditylenchus dipsaci',
          detectionResult: null,
        },
        {
          resultId: 'r2',
          sampleId: 's2',
          testArea: null,
          findingsType: 'nematologia_negative',
          pathogenName: 'Sin presencia de nemátodos',
          detectionResult: null,
        },
        {
          resultId: 'r3',
          sampleId: 's3',
          testArea: 'nematologia',
          findingsType: 'nematologia_negative',
          pathogenName: 'Nematodos no fitoparásitos (benéficos)',
          detectionResult: null,
        },
        {
          resultId: 'r4',
          sampleId: 's4',
          testArea: 'nematologia',
          findingsType: 'nematologia_positive',
          pathogenName: 'Globodera pallida',
          detectionResult: null,
        },
        {
          resultId: 'r5',
          sampleId: 's5',
          testArea: 'virologia',
          findingsType: 'virologia',
          pathogenName: 'Apple stem grooving virus',
          detectionResult: 'positive',
        },
        {
          resultId: 'r6',
          sampleId: 's6',
          testArea: 'nematologia',
          findingsType: 'nematologia_positive',
          pathogenName: 'Ditylenchus dipsaci',
          detectionResult: null,
        },
        {
          resultId: 'r6',
          sampleId: 's6',
          testArea: 'nematologia',
          findingsType: 'nematologia_positive',
          pathogenName: 'Globodera pallida',
          detectionResult: null,
        },
      ],
    })

    assert.deepEqual(
      dashboard.prevalence.map((row) => [row.pathogenName, row.count]),
      [
        ['Ditylenchus dipsaci', 2],
        ['Globodera pallida', 1],
        ['No fitoparásitos', 1],
        ['Sin presencia de nemátodos', 1],
      ]
    )
    assert.equal(dashboard.prevalence.some((row) => row.pathogenName === 'Apple stem grooving virus'), false)

    const april = dashboard.monthly.find((month) => month.monthKey === '2026-04')
    const may = dashboard.monthly.find((month) => month.monthKey === '2026-05')
    const september = dashboard.monthly.find((month) => month.monthKey === '2026-09')
    const june = dashboard.monthly.find((month) => month.monthKey === '2026-06')
    assert.equal(april?.totalSamples, 2)
    assert.equal(april?.positiveSamples, 1)
    assert.equal(april?.positivityPct, 50)
    assert.equal(may?.totalSamples, 1)
    assert.equal(may?.positiveSamples, 1)
    assert.equal(may?.positivityPct, 100)
    assert.equal(june?.totalSamples, 0)
    assert.equal(june?.positiveSamples, 0)
    assert.equal(september?.totalSamples, 1)
    assert.equal(september?.positiveSamples, 1)
    assert.equal(september?.positivityPct, 100)
  })

  it('sums non-phytoparasite aliases into a single No fitoparásitos bar', () => {
    const discipline = resolveDiscipline('nematologia')
    assert.ok(discipline)
    const dashboard = buildDisciplineDashboard({
      discipline: discipline!,
      months: 6,
      referenceDate: SEPTEMBER_2026,
      samples: [
        { id: 's1', receivedAt: '2026-09-02T15:00:00.000Z', receivedDate: null },
        { id: 's2', receivedAt: '2026-09-03T15:00:00.000Z', receivedDate: null },
      ],
      results: [
        { id: 'r1', sampleId: 's1', testArea: 'nematologia' },
        { id: 'r2', sampleId: 's2', testArea: 'nematologia' },
      ],
      findings: [
        {
          resultId: 'r1',
          sampleId: 's1',
          testArea: 'nematologia',
          findingsType: 'nematologia_negative',
          pathogenName: 'Nematodos no fitoparásitos (benéficos)',
          detectionResult: null,
        },
        {
          resultId: 'r2',
          sampleId: 's2',
          testArea: 'nematologia',
          findingsType: 'nematologia_negative',
          pathogenName: 'No fitoparásitos',
          detectionResult: null,
        },
      ],
    })

    assert.equal(prevalencePathogenName('Nematodos no fitoparásitos (benéficos)'), 'No fitoparásitos')
    assert.equal(prevalencePathogenName('No fitoparásitos'), 'No fitoparásitos')
    assert.deepEqual(
      dashboard.prevalence.map((row) => [row.pathogenName, row.count, row.pct]),
      [['No fitoparásitos', 2, 100]]
    )
    assert.equal(dashboard.monthly.find((month) => month.monthKey === '2026-09')?.positiveSamples, 2)
  })

  it('returns an empty ranking and zeroed months when the discipline has no results', () => {
    const discipline = resolveDiscipline('bacteriologia')
    assert.ok(discipline)
    const dashboard = buildDisciplineDashboard({
      discipline: discipline!,
      months: 6,
      referenceDate: SEPTEMBER_2026,
      samples: [],
      results: [],
      findings: [],
    })
    assert.equal(dashboard.prevalence.length, 0)
    assert.equal(dashboard.monthly.length, 6)
    assert.equal(dashboard.monthly.every((month) => month.totalSamples === 0 && month.positivityPct === 0), true)
  })
})
