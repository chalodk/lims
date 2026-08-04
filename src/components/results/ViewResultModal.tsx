'use client'

import { useState, useEffect, useCallback } from 'react'
import { ResultWithRelations } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

interface NematodeEntry {
  name: string
  quantity: string
  is_sag_zero_tolerance?: boolean
}

interface NematologyFindings {
  type: 'nematologia_positive' | 'nematologia_negative'
  nematodes: NematodeEntry[]
}

interface VirologyTest {
  identification: string
  method: string
  virus: string
  result: 'positive' | 'negative' | string
  is_sag_zero_tolerance?: boolean
}

interface VirologyFindings {
  type: 'virologia'
  tests: VirologyTest[]
}

interface PhytopathologyTest {
  identification: string
  microorganism: string
  dilutions: {
    '10-1': string
    '10-2': string
    '10-3': string
  }
  is_sag_zero_tolerance?: boolean
}

interface PhytopathologyFindings {
  type: 'fitopatologia'
  tests: PhytopathologyTest[]
}


// Type guard functions
function isNematologyFindings(f: unknown): f is NematologyFindings {
  return (
    typeof f === 'object' &&
    f !== null &&
    'type' in f &&
    'nematodes' in f &&
    ((f as Record<string, unknown>).type === 'nematologia_positive' || 
     (f as Record<string, unknown>).type === 'nematologia_negative') &&
    Array.isArray((f as Record<string, unknown>).nematodes)
  )
}

function isVirologyFindings(f: unknown): f is VirologyFindings {
  return (
    typeof f === 'object' &&
    f !== null &&
    'type' in f &&
    'tests' in f &&
    (f as Record<string, unknown>).type === 'virologia' &&
    Array.isArray((f as Record<string, unknown>).tests)
  )
}

function isPhytopathologyFindings(f: unknown): f is PhytopathologyFindings {
  return (
    typeof f === 'object' &&
    f !== null &&
    'type' in f &&
    'tests' in f &&
    (f as Record<string, unknown>).type === 'fitopatologia' &&
    Array.isArray((f as Record<string, unknown>).tests)
  )
}

const DEFAULT_COLUMN_LABELS: Record<string, Record<string, string>> = {
  nematology: { name: 'Nemátodo', quantity: 'Cantidad nematodos/250 cm³ de suelo' },
  virology: { identification: 'Identificación', method: 'Técnica utilizada', virus: 'Virus', result: 'Resultado' },
  bacteriology: { identification: 'Identificación', method: 'Técnica utilizada', microorganism: 'Bacteria', result: 'Resultado' },
  phytopathology: {
    sampleNumber: 'N° de muestra', identification: 'Identificación de la muestra',
    microorganism: 'Microorganismo Identificado', colonyCount: 'Recuento de microorganismos (N° de colonias/dilución)',
    dilution: 'Dilución utilizada', dilution10_1: '10⁻¹', dilution10_2: '10⁻²', dilution10_3: '10⁻³'
  },
  early_detection: {
    sampleCode: 'Código Muestra', identification: 'Identificación', variety: 'Variedad',
    unitsEvaluated: 'Unidades Evaluadas', severityScale: 'Escala de Severidad',
    severity0: '0', severity1: '1', severity2: '2', severity3: '3'
  }
}

function getColumnLabel(findings: unknown, areaKey: string, labelKey: string, fallback: string): string {
  if (findings && typeof findings === 'object' && 'columnLabels' in findings) {
    const labels = (findings as Record<string, unknown>).columnLabels as Record<string, string> | undefined
    if (labels?.[labelKey]) return labels[labelKey]
  }
  return DEFAULT_COLUMN_LABELS[areaKey]?.[labelKey] || fallback
}

import {
  FlaskConical,
  User,
  TestTube,
  AlertCircle,
  CheckCircle,
  Clock,
  Microscope,
  Bug,
  TrendingUp,
  Shield,
  Loader2,
  CheckCheck
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FormSection, ReadOnlyField } from '@/components/ui/form-section'

interface ViewResultModalProps {
  isOpen: boolean
  onClose: () => void
  resultId: string | null
  onValidated?: () => void
}

export default function ViewResultModal({ isOpen, onClose, resultId, onValidated }: ViewResultModalProps) {
  const { userRole } = useAuth()
  const [result, setResult] = useState<ResultWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const fetchResult = useCallback(async () => {
    if (!resultId) return

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/results/${resultId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch result details')
      }
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error fetching result:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar el resultado')
    } finally {
      setIsLoading(false)
    }
  }, [resultId])

  useEffect(() => {
    if (isOpen && resultId) {
      fetchResult()
    }
  }, [isOpen, resultId, fetchResult])

  const handleValidateResult = async () => {
    if (!result || !resultId) return

    if (!confirm('¿Estás seguro de que quieres validar este resultado? Esta acción no se puede deshacer.')) {
      return
    }

    setIsValidating(true)
    try {
      const response = await fetch(`/api/results/${resultId}/validate`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al validar el resultado')
      }

      await fetchResult()
      
      if (onValidated) {
        onValidated()
      }
      
      alert('Resultado validado exitosamente')
    } catch (error) {
      console.error('Error validating result:', error)
      alert('Error al validar el resultado. Por favor, intente nuevamente.')
    } finally {
      setIsValidating(false)
    }
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Sin estado
        </span>
      )
    }
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, text: 'Pendiente' },
      completed: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle, text: 'Completado' },
      validated: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, text: 'Validado' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const IconComponent = config.icon
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
        <IconComponent className="w-4 h-4 mr-2" />
        {config.text}
      </span>
    )
  }

  const getResultTypeBadge = (resultType: string | null) => {
    if (!resultType) return null
    
    const typeConfig = {
      positive: { color: 'bg-red-100 text-red-800 border-red-200', text: 'Positivo' },
      negative: { color: 'bg-green-100 text-green-800 border-green-200', text: 'Negativo' },
      inconclusive: { color: 'bg-gray-100 text-gray-800 border-gray-200', text: 'No conclusivo' }
    }
    
    const config = typeConfig[resultType as keyof typeof typeConfig]
    if (!config) return null
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
        {config.text}
      </span>
    )
  }

  const getSeverityBadge = (severity: string | null) => {
    if (!severity) return null
    
    const severityConfig = {
      low: { color: 'bg-green-100 text-green-800 border-green-200', text: 'Baja' },
      moderate: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Moderada' },
      high: { color: 'bg-orange-100 text-orange-800 border-orange-200', text: 'Alta' },
      severe: { color: 'bg-red-100 text-red-800 border-red-200', text: 'Severa' }
    }
    
    const config = severityConfig[severity as keyof typeof severityConfig]
    if (!config) return null
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
        <TrendingUp className="w-4 h-4 mr-2" />
        {config.text}
      </span>
    )
  }

  const getConfidenceBadge = (confidence: string | null) => {
    if (!confidence) return null
    
    const confidenceConfig = {
      low: { color: 'bg-red-100 text-red-800 border-red-200', text: 'Baja' },
      medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Media' },
      high: { color: 'bg-green-100 text-green-800 border-green-200', text: 'Alta' }
    }
    
    const config = confidenceConfig[confidence as keyof typeof confidenceConfig]
    if (!config) return null
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
        <Shield className="w-4 h-4 mr-2" />
        Confianza {config.text}
      </span>
    )
  }

  const renderNematologyFindings = (findings: unknown) => {
    if (!isNematologyFindings(findings)) {
      return null
    }

    return (
      <div className="bg-white rounded border overflow-hidden">
        <div className="bg-green-50 px-4 py-3 border-b">
          <h5 className="text-sm font-medium text-green-900 flex items-center">
            <Bug className="h-4 w-4 mr-2" />
            Resultados de Nematología
            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
              findings.type === 'nematologia_positive' 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {findings.type === 'nematologia_positive' ? 'Positivo' : 'Negativo'}
            </span>
          </h5>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {getColumnLabel(findings, 'nematology', 'name', 'Nemátodo')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {getColumnLabel(findings, 'nematology', 'quantity', 'Cantidad nematodos/250 cm³ de suelo')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tol. cero SAG
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {findings.nematodes.map((nematode: NematodeEntry, index: number) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {nematode.name || 'No especificado'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {nematode.quantity || 'No especificado'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {nematode.is_sag_zero_tolerance ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Sí
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderVirologyFindings = (findings: unknown) => {
    if (!isVirologyFindings(findings)) {
      return null
    }

    return (
      <div className="bg-white rounded border overflow-hidden">
        <div className="bg-blue-50 px-4 py-3 border-b">
          <h5 className="text-sm font-medium text-blue-900 flex items-center">
            <Microscope className="h-4 w-4 mr-2" />
            Resultados de Virología
          </h5>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {getColumnLabel(findings, 'virology', 'identification', 'Identificación')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {getColumnLabel(findings, 'virology', 'method', 'Técnica utilizada')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {getColumnLabel(findings, 'virology', 'virus', 'Virus')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {getColumnLabel(findings, 'virology', 'result', 'Resultado')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tol. cero SAG
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {findings.tests.map((test: VirologyTest, index: number) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {test.identification || 'No especificado'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {test.method || 'No especificado'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {test.virus || 'No especificado'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      test.result === 'positive' 
                        ? 'bg-red-100 text-red-700' 
                        : test.result === 'negative'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {test.result === 'positive' ? 'Positivo' : 
                       test.result === 'negative' ? 'Negativo' : 
                       test.result || 'No especificado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {test.is_sag_zero_tolerance ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Sí
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderPhytopathologyFindings = (findings: unknown) => {
    if (!isPhytopathologyFindings(findings)) {
      return null
    }

    return (
      <div className="bg-white rounded border overflow-hidden">
        <div className="bg-yellow-50 px-4 py-3 border-b">
          <h5 className="text-sm font-medium text-yellow-900 flex items-center">
            <Microscope className="h-4 w-4 mr-2" />
            Resultados de Fitopatología
          </h5>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-yellow-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {getColumnLabel(findings, 'phytopathology', 'sampleNumber', 'N° de muestra')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {getColumnLabel(findings, 'phytopathology', 'identification', 'Identificación de la muestra')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {getColumnLabel(findings, 'phytopathology', 'microorganism', 'Microorganismo Identificado')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan={3}>
                  {getColumnLabel(findings, 'phytopathology', 'colonyCount', 'Recuento de microorganismos (N° de colonias/dilución)')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tol. cero SAG
                </th>
              </tr>
              <tr className="bg-yellow-100">
                <th colSpan={3}></th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                  {getColumnLabel(findings, 'phytopathology', 'dilution', 'Dilución utilizada')}
                </th>
                <th colSpan={2}></th>
                <th></th>
              </tr>
              <tr className="bg-yellow-100">
                <th colSpan={3}></th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                  {getColumnLabel(findings, 'phytopathology', 'dilution10_1', '10⁻¹')}
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                  {getColumnLabel(findings, 'phytopathology', 'dilution10_2', '10⁻²')}
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                  {getColumnLabel(findings, 'phytopathology', 'dilution10_3', '10⁻³')}
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {findings.tests.map((test: PhytopathologyTest, index: number) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-mono">
                    {index + 1}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {test.identification || 'No especificado'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {test.microorganism || 'No especificado'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-mono">
                    {test.dilutions?.['10-1'] || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-mono">
                    {test.dilutions?.['10-2'] || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-mono">
                    {test.dilutions?.['10-3'] || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {test.is_sag_zero_tolerance ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Sí
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && !isValidating) onClose()
  }

  const findingsMethodologies =
    result?.findings && typeof result.findings === 'object'
      ? (result.findings as Record<string, unknown>).methodologies
      : null

  const methodologyDisplay =
    findingsMethodologies &&
    Array.isArray(findingsMethodologies) &&
    findingsMethodologies.length > 0
      ? findingsMethodologies.join(', ')
      : result?.sample_tests?.methods?.name || result?.methodology || 'No especificado'

  const proseHtmlClassName =
    'prose prose-sm max-w-none text-sm text-gray-900 [&_h1]:whitespace-pre-wrap [&_h2]:whitespace-pre-wrap [&_h3]:whitespace-pre-wrap [&_li]:whitespace-pre-wrap [&_p]:whitespace-pre-wrap'

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        showCloseButton={!isValidating}
        className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        onInteractOutside={(event) => {
          if (isValidating) event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          if (isValidating) event.preventDefault()
        }}
      >
        <DialogHeader className="border-b border-gray-100 bg-white">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              <FlaskConical className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <DialogTitle>Detalles del Resultado</DialogTitle>
              <DialogDescription className="mt-1">
                {result?.samples?.code
                  ? `Muestra: ${result.samples.code}`
                  : 'Información del resultado de análisis'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              <span className="ml-2 text-gray-600">Cargando resultado...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Error al cargar</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
              <Button type="button" variant="outline" onClick={fetchResult} className="mt-4">
                Reintentar
              </Button>
            </div>
          ) : result ? (
            <>
              <FormSection
                step={1}
                title="Estado y muestra"
                description="Estado del resultado e información de la muestra"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ReadOnlyField label="Estado" value={getStatusBadge(result.status)} />
                  {result.result_type ? (
                    <ReadOnlyField
                      label="Tipo de Resultado"
                      value={getResultTypeBadge(result.result_type)}
                    />
                  ) : null}
                  {result.severity ? (
                    <ReadOnlyField
                      label="Severidad"
                      value={getSeverityBadge(result.severity)}
                    />
                  ) : null}
                  {result.confidence ? (
                    <ReadOnlyField
                      label="Confianza"
                      value={getConfidenceBadge(result.confidence)}
                    />
                  ) : null}
                  <ReadOnlyField
                    label="Código de muestra"
                    value={
                      <span className="inline-flex items-center gap-2">
                        <TestTube className="h-4 w-4 text-muted-foreground" />
                        {result.samples?.code || '—'}
                      </span>
                    }
                  />
                  <ReadOnlyField
                    label="Cliente"
                    value={
                      <span className="inline-flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {result.samples?.clients?.name || '—'}
                      </span>
                    }
                  />
                  <ReadOnlyField
                    label="Especie"
                    value={
                      <span className="inline-flex items-center gap-2">
                        <Microscope className="h-4 w-4 text-muted-foreground" />
                        {result.samples?.species || '—'}
                        {result.samples?.variety
                          ? ` - ${result.samples.variety}`
                          : ''}
                      </span>
                    }
                  />
                  <ReadOnlyField
                    label="Fecha de recepción"
                    value={
                      result.samples?.received_date
                        ? new Date(result.samples.received_date).toLocaleDateString()
                        : 'Fecha no disponible'
                    }
                  />
                </div>
              </FormSection>

              {result.sample_tests ? (
                <FormSection
                  step={2}
                  title="Información del análisis"
                  description="Área, prueba y método asociados"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <ReadOnlyField
                      label="Área"
                      value={
                        <span className="capitalize">
                          {result.test_area?.replace('_', ' ') || 'No especificada'}
                        </span>
                      }
                    />
                    <ReadOnlyField
                      label="Prueba"
                      value={result.sample_tests.test_catalog?.name || 'No especificada'}
                    />
                    <ReadOnlyField
                      label="Método"
                      value={methodologyDisplay}
                      className="sm:col-span-2"
                    />
                  </div>
                </FormSection>
              ) : null}

              {result.pathogen_identified ? (
                <FormSection
                  step={3}
                  title="Información del patógeno"
                  description="Identificación del organismo detectado"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <ReadOnlyField
                      label="Patógeno Identificado"
                      value={
                        <span className="inline-flex items-center gap-2 font-medium">
                          <Bug className="h-4 w-4 text-muted-foreground" />
                          {result.pathogen_identified}
                        </span>
                      }
                    />
                    {result.pathogen_type ? (
                      <ReadOnlyField
                        label="Tipo"
                        value={
                          <span className="capitalize">{result.pathogen_type}</span>
                        }
                      />
                    ) : null}
                  </div>
                </FormSection>
              ) : null}

              {(result.diagnosis || result.conclusion || result.recommendations) && (
                <FormSection
                  step={result.pathogen_identified ? 4 : 3}
                  title="Diagnóstico y notas"
                  description="Información clínica y recomendaciones"
                >
                  <div className="space-y-4">
                    {result.diagnosis ? (
                      <ReadOnlyField
                        label="Diagnóstico"
                        value={
                          <div
                            className={proseHtmlClassName}
                            dangerouslySetInnerHTML={{ __html: result.diagnosis }}
                          />
                        }
                      />
                    ) : null}
                    {result.conclusion ? (
                      <ReadOnlyField
                        label="Conclusión"
                        value={
                          <div
                            className={proseHtmlClassName}
                            dangerouslySetInnerHTML={{ __html: result.conclusion }}
                          />
                        }
                      />
                    ) : null}
                    {result.recommendations ? (
                      <ReadOnlyField
                        label="Recomendaciones"
                        value={
                          <div
                            className={proseHtmlClassName}
                            dangerouslySetInnerHTML={{ __html: result.recommendations }}
                          />
                        }
                      />
                    ) : null}
                  </div>
                </FormSection>
              )}

              {result.findings && Object.keys(result.findings).length > 0 ? (
                <FormSection
                  step={5}
                  title="Hallazgos técnicos"
                  description="Tablas y datos estructurados del análisis"
                >
                  {renderNematologyFindings(result.findings)}
                  {renderVirologyFindings(result.findings)}
                  {renderPhytopathologyFindings(result.findings)}
                  {!renderNematologyFindings(result.findings) &&
                    !renderVirologyFindings(result.findings) &&
                    !renderPhytopathologyFindings(result.findings) && (
                      <div className="rounded-lg border border-gray-100 bg-white p-3">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700">
                          {JSON.stringify(result.findings, null, 2)}
                        </pre>
                      </div>
                    )}
                </FormSection>
              ) : null}

              <FormSection
                title="Información del personal"
                description="Quién realizó y validó el resultado"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ReadOnlyField
                    label="Realizado por"
                    value={
                      <div>
                        <div className="inline-flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {result.performed_by_user?.name ||
                            result.performed_by_user?.email ||
                            'No disponible'}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {result.performed_at
                            ? new Date(result.performed_at).toLocaleString()
                            : 'N/A'}
                        </p>
                      </div>
                    }
                  />
                  {result.validated_by_user ? (
                    <ReadOnlyField
                      label="Validado por"
                      value={
                        <div>
                          <div className="inline-flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            {result.validated_by_user.name ||
                              result.validated_by_user.email}
                          </div>
                          {result.validation_date ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {new Date(result.validation_date).toLocaleString()}
                            </p>
                          ) : null}
                        </div>
                      }
                    />
                  ) : null}
                </div>
              </FormSection>
            </>
          ) : (
            <div className="py-12 text-center">
              <FlaskConical className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Resultado no encontrado
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                El resultado solicitado no se pudo encontrar.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="justify-between sm:justify-between">
          <div>
            {result &&
              result.status !== 'validated' &&
              (userRole === 'admin' || userRole === 'validador') && (
                <Button
                  type="button"
                  onClick={handleValidateResult}
                  disabled={isValidating}
                  className="gap-2"
                >
                  {isValidating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4" />
                  )}
                  {isValidating ? 'Validando...' : 'Validar Resultado'}
                </Button>
              )}
          </div>
          <Button type="button" variant="outline" onClick={onClose} disabled={isValidating}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}