'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  FileText,
  Loader2,
  RotateCcw,
  Sparkles,
  TestTube,
  Upload,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import ProducerDemoShell, {
  type ProducerDemoSection,
} from '@/components/ai-reports/ProducerDemoShell'
import {
  DisciplineDonutChart,
} from '@/components/cliente/DisciplineDonutChart'
import {
  PrevalenceBarChart,
} from '@/components/cliente/PrevalenceBarChart'
import {
  SemaforoDonutChart,
} from '@/components/cliente/SemaforoDonutChart'
import { DetectionsTable } from '@/components/cliente/DetectionsTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  AI_REPORTS_LOADING_STEPS,
  buildAiReportsDemoDashboard,
  getAiReportsLoadingStepDurationsMs,
} from '@/lib/ai-reports/demoMockData'

type DemoPhase = 'upload' | 'loading' | 'results'

type StagedFile = {
  id: string
  name: string
  size: number
  type: string
}

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx'] as const
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

function isAcceptedFile(file: File): boolean {
  const lowerName = file.name.toLowerCase()
  const hasExtension = ACCEPTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  const hasMime = ACCEPTED_MIME_TYPES.includes(
    file.type as (typeof ACCEPTED_MIME_TYPES)[number]
  )
  return hasExtension || hasMime
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AiReportsDemoPage() {
  const router = useRouter()
  const { userRole, isLoading: authLoading, isAuthenticated } = useAuth()

  const [phase, setPhase] = useState<DemoPhase>('upload')
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [loadingStepIndex, setLoadingStepIndex] = useState(0)
  const [activeSection, setActiveSection] = useState<ProducerDemoSection>('panel')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const loadingTimersRef = useRef<number[]>([])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (userRole && userRole !== 'csx') {
      router.replace('/dashboard')
    }
  }, [authLoading, isAuthenticated, userRole, router])

  useEffect(() => {
    return () => {
      loadingTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
    }
  }, [])

  const clearLoadingTimers = () => {
    loadingTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
    loadingTimersRef.current = []
  }

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const incoming = Array.from(fileList).filter(isAcceptedFile)
    if (incoming.length === 0) return

    setStagedFiles((previous) => {
      const existingKeys = new Set(previous.map((file) => `${file.name}-${file.size}`))
      const nextFiles = incoming
        .filter((file) => !existingKeys.has(`${file.name}-${file.size}`))
        .map((file) => ({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          size: file.size,
          type: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'docx'),
        }))
      return [...previous, ...nextFiles]
    })
  }, [])

  const removeFile = (fileId: string) => {
    setStagedFiles((previous) => previous.filter((file) => file.id !== fileId))
  }

  const handleReset = () => {
    clearLoadingTimers()
    setPhase('upload')
    setStagedFiles([])
    setLoadingStepIndex(0)
    setActiveSection('panel')
    setIsDragging(false)
  }

  const handleStartProcessing = () => {
    if (stagedFiles.length === 0) return
    clearLoadingTimers()
    setLoadingStepIndex(0)
    setPhase('loading')
    setActiveSection('panel')

    const stepDurationsMs = getAiReportsLoadingStepDurationsMs(stagedFiles.length)
    let elapsedMs = 0

    AI_REPORTS_LOADING_STEPS.forEach((_, index) => {
      elapsedMs += stepDurationsMs[index] ?? 1400
      const timerId = window.setTimeout(() => {
        if (index < AI_REPORTS_LOADING_STEPS.length - 1) {
          setLoadingStepIndex(index + 1)
        } else {
          setPhase('results')
        }
      }, elapsedMs)
      loadingTimersRef.current.push(timerId)
    })
  }

  const dashboard = useMemo(
    () => buildAiReportsDemoDashboard(stagedFiles.length),
    [stagedFiles.length]
  )

  if (authLoading || !isAuthenticated || (userRole && userRole !== 'csx')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando demo…</p>
        </div>
      </div>
    )
  }

  if (phase === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50/80 via-background to-background">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-10 sm:px-6">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Sparkles className="h-6 w-6 text-green-700" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Informes con IA
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              Carga informes de laboratorio en PDF o DOCX. El sistema extrae la información,
              la organiza con conocimiento agrícola y cruza reglas SAG para armar tu panel.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cargar informes</CardTitle>
              <CardDescription>Formatos admitidos: PDF y DOCX. Puedes seleccionar varios archivos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={(event) => {
                  event.preventDefault()
                  setIsDragging(false)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  setIsDragging(false)
                  if (event.dataTransfer.files?.length) {
                    addFiles(event.dataTransfer.files)
                  }
                }}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors',
                  isDragging
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-gray-50/60 hover:border-green-400 hover:bg-green-50/40'
                )}
              >
                <Upload className="mb-3 h-8 w-8 text-green-700" />
                <p className="text-sm font-medium text-foreground">
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
                <p className="mt-1 text-xs text-muted-foreground">PDF · DOCX</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    if (event.target.files?.length) {
                      addFiles(event.target.files)
                      event.target.value = ''
                    }
                  }}
                />
              </div>

              {stagedFiles.length > 0 ? (
                <ul className="space-y-2">
                  {stagedFiles.map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-green-700" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeFile(file.id)}
                        aria-label={`Quitar ${file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {stagedFiles.length === 0
                    ? 'Aún no hay archivos seleccionados'
                    : `${stagedFiles.length} informe${stagedFiles.length === 1 ? '' : 's'} listo${stagedFiles.length === 1 ? '' : 's'} para procesar`}
                </p>
                <Button
                  type="button"
                  disabled={stagedFiles.length === 0}
                  onClick={handleStartProcessing}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Procesar con IA
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-green-50/80 via-background to-background px-4">
        <Card className="w-full max-w-lg">
          <CardContent className="space-y-8 py-10">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-green-700" />
              <h2 className="text-xl font-semibold text-foreground">Procesando informes</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {stagedFiles.length} archivo{stagedFiles.length === 1 ? '' : 's'} en análisis
              </p>
            </div>

            <ol className="space-y-3">
              {AI_REPORTS_LOADING_STEPS.map((stepLabel, index) => {
                const isDone = index < loadingStepIndex
                const isCurrent = index === loadingStepIndex
                return (
                  <li
                    key={stepLabel}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm',
                      isCurrent && 'border-green-300 bg-green-50 text-green-900',
                      isDone && 'border-gray-200 bg-white text-foreground',
                      !isDone && !isCurrent && 'border-gray-100 bg-gray-50 text-muted-foreground'
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                    ) : isCurrent ? (
                      <Loader2 className="h-5 w-5 shrink-0 animate-spin text-green-700" />
                    ) : (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-300 text-[11px] font-semibold">
                        {index + 1}
                      </span>
                    )}
                    <span className={cn('font-medium', isCurrent && 'text-base')}>{stepLabel}</span>
                  </li>
                )
              })}
            </ol>
          </CardContent>
        </Card>
      </div>
    )
  }

  const yearLabel = new Date(dashboard.period.from).getFullYear()
  const kpis = dashboard.kpis

  return (
    <ProducerDemoShell
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      headerAction={
        <Button type="button" variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" />
          Cargar de nuevo
        </Button>
      }
    >
      {activeSection === 'informes' ? (
        <div className="mx-auto max-w-3xl p-4 sm:p-6">
          <Card>
            <CardHeader>
              <CardTitle>Informes</CardTitle>
              <CardDescription>
                Sección de listado de informes (no usada en esta demo de video).
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Aquí el productor vería el historial de informes cargados y generados.
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Panel fitosanitario
            </h1>
            <p className="text-sm text-muted-foreground">
              Resumen operacional y de riesgo a partir de tus informes · Año {yearLabel}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Muestras recepcionadas"
              value={String(kpis.samplesReceived)}
              icon={<TestTube className="h-5 w-5 text-primary" />}
            />
            <KpiCard
              title="Informes emitidos"
              value={String(kpis.reportsIssued)}
              subtitle="según archivos cargados"
              icon={<FileCheck2 className="h-5 w-5 text-primary" />}
            />
            <KpiCard
              title="Cobertura por análisis"
              value={kpis.analysisCoverageRatio.toFixed(2)}
              subtitle="análisis / muestra"
              icon={<Activity className="h-5 w-5 text-primary" />}
            />
            <KpiCard
              title="% crítico (tol. cero)"
              value={`${kpis.criticalRate.toFixed(1)}%`}
              subtitle="sobre detecciones normalizadas"
              icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por disciplina</CardTitle>
                <CardDescription>Peso relativo de cada área de análisis</CardDescription>
              </CardHeader>
              <CardContent>
                <DisciplineDonutChart data={dashboard.byDiscipline} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prevalencia por patógeno</CardTitle>
                <CardDescription>Top detecciones en el período</CardDescription>
              </CardHeader>
              <CardContent>
                <PrevalenceBarChart data={dashboard.prevalence} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Semáforo sanitario</CardTitle>
              <CardDescription>
                Crítico = tolerancia cero SAG. Sin umbrales UDE en esta versión.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SemaforoDonutChart data={dashboard.semaforo} />
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Detecciones recientes</h2>
              <p className="text-sm text-muted-foreground">
                Últimas detecciones normalizadas del período
              </p>
            </div>
            <DetectionsTable
              rows={dashboard.detections}
              hasNormalizedFindings={dashboard.semaforo.hasNormalizedFindings}
            />
          </div>
        </div>
      )}
    </ProducerDemoShell>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string
  value: string
  subtitle?: string
  icon: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      </CardContent>
    </Card>
  )
}
