import type { DisciplineRow } from '@/components/cliente/DisciplineDonutChart'
import type { PrevalenceRow } from '@/components/cliente/PrevalenceBarChart'
import type { SemaforoData } from '@/components/cliente/SemaforoDonutChart'
import type { DetectionRow } from '@/components/cliente/DetectionsTable'

export type AiReportsDemoDashboard = {
  period: { from: string; to: string }
  kpis: {
    samplesReceived: number
    reportsIssued: number
    analysisCoverageRatio: number
    criticalRate: number
  }
  byDiscipline: DisciplineRow[]
  prevalence: PrevalenceRow[]
  semaforo: SemaforoData
  detections: DetectionRow[]
}

const DISCIPLINE_WEIGHTS: Array<{ typeKey: string; label: string; weight: number }> = [
  { typeKey: 'nematologia', label: 'Nematología', weight: 0.4 },
  { typeKey: 'virologia', label: 'Virología', weight: 0.3 },
  { typeKey: 'fitopatologia', label: 'Fitopatología', weight: 0.2 },
  { typeKey: 'bacteriologia', label: 'Bacteriología', weight: 0.1 },
]

type PathogenCatalogItem = {
  pathogenName: string
  typeKey: string
  testAreaLabel: string
  /** Peso relativo dentro de su disciplina */
  weight: number
  quantity: string | null
  isSagZeroTolerance: boolean
  sampleCode: string
  createdAtMonthDay: string
}

/** Catálogo por disciplina: prevalencia y tabla de detecciones salen de aquí. */
const PATHOGEN_CATALOG: PathogenCatalogItem[] = [
  // Nematología
  {
    pathogenName: 'Meloidogyne spp.',
    typeKey: 'nematologia',
    testAreaLabel: 'Nematología',
    weight: 0.4,
    quantity: '320',
    isSagZeroTolerance: true,
    sampleCode: 'LIM-2026-0841',
    createdAtMonthDay: '03-12',
  },
  {
    pathogenName: 'Xiphinema index',
    typeKey: 'nematologia',
    testAreaLabel: 'Nematología',
    weight: 0.35,
    quantity: '45',
    isSagZeroTolerance: true,
    sampleCode: 'LIM-2026-0847',
    createdAtMonthDay: '03-18',
  },
  {
    pathogenName: 'Pratylenchus spp.',
    typeKey: 'nematologia',
    testAreaLabel: 'Nematología',
    weight: 0.25,
    quantity: '110',
    isSagZeroTolerance: false,
    sampleCode: 'LIM-2026-0873',
    createdAtMonthDay: '05-08',
  },
  // Virología
  {
    pathogenName: 'GLRaV-3',
    typeKey: 'virologia',
    testAreaLabel: 'Virología',
    weight: 0.55,
    quantity: null,
    isSagZeroTolerance: false,
    sampleCode: 'LIM-2026-0852',
    createdAtMonthDay: '04-02',
  },
  {
    pathogenName: 'GFLV',
    typeKey: 'virologia',
    testAreaLabel: 'Virología',
    weight: 0.45,
    quantity: null,
    isSagZeroTolerance: false,
    sampleCode: 'LIM-2026-0881',
    createdAtMonthDay: '04-14',
  },
  // Fitopatología
  {
    pathogenName: 'Botrytis cinerea',
    typeKey: 'fitopatologia',
    testAreaLabel: 'Fitopatología',
    weight: 0.6,
    quantity: null,
    isSagZeroTolerance: false,
    sampleCode: 'LIM-2026-0860',
    createdAtMonthDay: '04-21',
  },
  {
    pathogenName: 'Uncinula necator',
    typeKey: 'fitopatologia',
    testAreaLabel: 'Fitopatología',
    weight: 0.4,
    quantity: null,
    isSagZeroTolerance: false,
    sampleCode: 'LIM-2026-0894',
    createdAtMonthDay: '05-02',
  },
  // Bacteriología (solo aparece si hay informes en esa área)
  {
    pathogenName: 'Agrobacterium vitis',
    typeKey: 'bacteriologia',
    testAreaLabel: 'Bacteriología',
    weight: 0.6,
    quantity: null,
    isSagZeroTolerance: true,
    sampleCode: 'LIM-2026-0902',
    createdAtMonthDay: '05-16',
  },
  {
    pathogenName: 'Xylophilus ampelinus',
    typeKey: 'bacteriologia',
    testAreaLabel: 'Bacteriología',
    weight: 0.4,
    quantity: null,
    isSagZeroTolerance: false,
    sampleCode: 'LIM-2026-0910',
    createdAtMonthDay: '05-22',
  },
]

/** Reparte `total` enteros según pesos (suma exacta = total). */
function allocateByWeights(total: number, weights: number[]): number[] {
  if (total <= 0) return weights.map(() => 0)

  const raw = weights.map((weight) => total * weight)
  const floors = raw.map((value) => Math.floor(value))
  const remaining = total - floors.reduce((sum, value) => sum + value, 0)

  const order = raw
    .map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction)

  const result = [...floors]
  for (let i = 0; i < remaining; i++) {
    result[order[i % order.length].index] += 1
  }
  return result
}

function buildDisciplineRows(reportCount: number): DisciplineRow[] {
  const counts = allocateByWeights(
    reportCount,
    DISCIPLINE_WEIGHTS.map((item) => item.weight)
  )

  return DISCIPLINE_WEIGHTS.map((item, index) => ({
    typeKey: item.typeKey,
    label: item.label,
    count: counts[index],
  })).filter((row) => row.count > 0)
}

/**
 * Prevalencia coherente con disciplinas activas.
 * Total de detecciones ≈ reportCount * 2 (para que con 3 y 10 se note la escala).
 */
function buildPrevalenceAndDetections(
  year: string,
  byDiscipline: DisciplineRow[]
): { prevalence: PrevalenceRow[]; detections: DetectionRow[]; critico: number; controlado: number } {
  const disciplineCountByKey = new Map(
    byDiscipline.map((row) => [row.typeKey, row.count])
  )

  const activePathogens = PATHOGEN_CATALOG.filter(
    (item) => (disciplineCountByKey.get(item.typeKey) || 0) > 0
  )

  // Por disciplina activa: detecciones = count_disciplina * 2, repartidas entre patógenos de esa área
  const pathogenCounts = new Map<string, number>()

  for (const discipline of byDiscipline) {
    const pathogensInArea = activePathogens.filter((item) => item.typeKey === discipline.typeKey)
    if (pathogensInArea.length === 0) continue

    const areaDetectionTotal = Math.max(1, discipline.count * 2)
    const allocated = allocateByWeights(
      areaDetectionTotal,
      pathogensInArea.map((item) => item.weight)
    )

    pathogensInArea.forEach((item, index) => {
      pathogenCounts.set(item.pathogenName, allocated[index])
    })
  }

  const prevalenceRaw = activePathogens
    .map((item) => ({
      pathogenName: item.pathogenName,
      count: pathogenCounts.get(item.pathogenName) || 0,
    }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)

  const prevalenceTotal = prevalenceRaw.reduce((sum, row) => sum + row.count, 0)
  const prevalence: PrevalenceRow[] = prevalenceRaw.map((row) => ({
    pathogenName: row.pathogenName,
    count: row.count,
    pct: prevalenceTotal > 0 ? Math.round((row.count / prevalenceTotal) * 100) : 0,
  }))

  // Tabla: una fila por patógeno activo con count > 0 (máx 6 para no saturar el video)
  const detections: DetectionRow[] = activePathogens
    .filter((item) => (pathogenCounts.get(item.pathogenName) || 0) > 0)
    .slice(0, 6)
    .map((item, index) => ({
      id: `demo-det-${index + 1}`,
      sampleCode: item.sampleCode,
      pathogenName: item.pathogenName,
      quantity: item.quantity,
      testAreaLabel: item.testAreaLabel,
      isSagZeroTolerance: item.isSagZeroTolerance,
      reportId: null,
      createdAt: `${year}-${item.createdAtMonthDay}T10:00:00.000Z`,
    }))

  const critico = detections.filter((row) => row.isSagZeroTolerance).length
  const controlado = Math.max(0, prevalenceTotal - critico)

  return { prevalence, detections, critico, controlado }
}

/**
 * Panel mock parametrizado por N archivos.
 * - reportsIssued = N
 * - anillo disciplinas suma N
 * - prevalencia/detecciones solo de áreas con count > 0 (sin bacterias si no hay bacteriología)
 *
 * Referencia video: N=3 → sin bacteriología; N=10 → incluye bacteriología.
 */
export function buildAiReportsDemoDashboard(reportCount: number): AiReportsDemoDashboard {
  const year = String(new Date().getFullYear())
  const safeReportCount = Math.max(0, reportCount)
  const samplesReceived = Math.max(safeReportCount, Math.round(safeReportCount * 1.4))
  const byDiscipline = buildDisciplineRows(safeReportCount)
  const { prevalence, detections, critico, controlado } = buildPrevalenceAndDetections(
    year,
    byDiscipline
  )

  const detectionTotal = prevalence.reduce((sum, row) => sum + row.count, 0)
  const criticalRate =
    detectionTotal > 0 ? Number(((critico / detectionTotal) * 100).toFixed(1)) : 0

  return {
    period: {
      from: `${year}-01-01`,
      to: `${year}-12-31`,
    },
    kpis: {
      samplesReceived,
      reportsIssued: safeReportCount,
      analysisCoverageRatio: 1.85,
      criticalRate,
    },
    byDiscipline,
    prevalence,
    semaforo: {
      critico,
      controlado,
      hasNormalizedFindings: detectionTotal > 0,
    },
    detections,
  }
}

export const AI_REPORTS_LOADING_STEPS = [
  'Leyendo archivos',
  'Ajustando a esquemas',
  'Aplicando reglas agrícolas y cruce SAG',
] as const

const BASE_STEP_MS = 1400

/**
 * Duración por paso de loading.
 * Con muchos archivos (p. ej. 10) los 2 primeros pasos se alargan para el video.
 */
export function getAiReportsLoadingStepDurationsMs(reportCount: number): number[] {
  const heavyBatch = reportCount >= 10
  return [
    heavyBatch ? 2800 : BASE_STEP_MS, // Leyendo archivos
    heavyBatch ? 2600 : BASE_STEP_MS, // Ajustando a esquemas
    BASE_STEP_MS, // Aplicando reglas agrícolas y cruce SAG
  ]
}
