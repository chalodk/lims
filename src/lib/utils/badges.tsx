/**
 * Reusable badge components with consistent null handling
 */

import { CheckCircle, Clock, AlertTriangle, Eye } from 'lucide-react'
import type { 
  SampleStatus, 
  ResultStatus, 
  ReportStatus, 
  SLAType, 
  SLAStatus,
  ResultType,
  SeverityExtended,
  Confidence,
  ReportTemplate
} from '@/types/database'

// Sample Status Badge
export const getSampleStatusBadge = (status: SampleStatus | null) => {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <Clock className="w-3 h-3 mr-1" />
        Sin estado
      </span>
    )
  }

  const statusConfig = {
    received: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, text: 'Recibida' },
    processing: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Procesando' },
    microscopy: { color: 'bg-purple-100 text-purple-800', icon: Eye, text: 'Microscopía' },
    isolation: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle, text: 'Aislamiento' },
    identification: { color: 'bg-indigo-100 text-indigo-800', icon: Eye, text: 'Identificación' },
    molecular_analysis: { color: 'bg-pink-100 text-pink-800', icon: Eye, text: 'Análisis Molecular' },
    validation: { color: 'bg-amber-100 text-amber-800', icon: CheckCircle, text: 'Validación' },
    completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Completada' }
  }

  const config = statusConfig[status] || statusConfig.received
  const IconComponent = config.icon

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <IconComponent className="w-3 h-3 mr-1" />
      {config.text}
    </span>
  )
}

// Result Status Badge
export const getResultStatusBadge = (status: ResultStatus | null) => {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <Clock className="w-3 h-3 mr-1" />
        Sin estado
      </span>
    )
  }

  const statusConfig = {
    pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pendiente' },
    completed: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, text: 'Completado' },
    validated: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Validado' }
  }

  const config = statusConfig[status] || statusConfig.pending
  const IconComponent = config.icon

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <IconComponent className="w-3 h-3 mr-1" />
      {config.text}
    </span>
  )
}

// Report Status Badge
export const getReportStatusBadge = (status: ReportStatus | null) => {
  if (!status) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Sin estado
      </span>
    )
  }

  const statusConfig = {
    draft: 'bg-gray-100 text-gray-800',
    generated: 'bg-blue-100 text-blue-800',
    sent: 'bg-green-100 text-green-800'
  }

  const statusLabels = {
    draft: 'Borrador',
    generated: 'Generado',
    sent: 'Enviado'
  }

  const colorClass = statusConfig[status] || statusConfig.draft
  const label = statusLabels[status] || status

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {label}
    </span>
  )
}

// SLA Type Badge
export const getSlaTypeBadge = (slaType: SLAType | null) => {
  if (!slaType) return null

  const typeConfig = {
    normal: { color: 'bg-blue-100 text-blue-800', text: 'Normal' },
    express: { color: 'bg-orange-100 text-orange-800', text: 'Express' }
  }

  const config = typeConfig[slaType] || typeConfig.normal

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.text}
    </span>
  )
}

// SLA Status Badge
export const getSlaStatusBadge = (status: SLAStatus | null) => {
  if (!status) return null

  const statusConfig = {
    on_time: { color: 'bg-green-100 text-green-800', text: 'A tiempo' },
    at_risk: { color: 'bg-yellow-100 text-yellow-800', text: 'En riesgo' },
    breached: { color: 'bg-red-100 text-red-800', text: 'Vencido' }
  }

  const config = statusConfig[status] || statusConfig.on_time

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.text}
    </span>
  )
}

// Result Type Badge
export const getResultTypeBadge = (resultType: ResultType | null) => {
  if (!resultType) return null

  const typeConfig = {
    positive: { color: 'bg-red-100 text-red-800', text: 'Positivo' },
    negative: { color: 'bg-green-100 text-green-800', text: 'Negativo' },
    inconclusive: { color: 'bg-yellow-100 text-yellow-800', text: 'No concluyente' }
  }

  const config = typeConfig[resultType] || typeConfig.inconclusive

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.text}
    </span>
  )
}

// Severity Badge
export const getSeverityBadge = (severity: SeverityExtended | null) => {
  if (!severity) return null

  const severityConfig = {
    low: { color: 'bg-green-100 text-green-800', text: 'Baja' },
    moderate: { color: 'bg-yellow-100 text-yellow-800', text: 'Moderada' },
    high: { color: 'bg-orange-100 text-orange-800', text: 'Alta' },
    severe: { color: 'bg-red-100 text-red-800', text: 'Severa' }
  }

  const config = severityConfig[severity] || severityConfig.low

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.text}
    </span>
  )
}

// Confidence Badge
export const getConfidenceBadge = (confidence: Confidence | null) => {
  if (!confidence) return null

  const confidenceConfig = {
    low: { color: 'bg-red-100 text-red-800', text: 'Baja' },
    medium: { color: 'bg-yellow-100 text-yellow-800', text: 'Media' },
    high: { color: 'bg-green-100 text-green-800', text: 'Alta' }
  }

  const config = confidenceConfig[confidence] || confidenceConfig.medium

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      {config.text}
    </span>
  )
}

// Template Badge
export const getTemplateBadge = (template: ReportTemplate | null) => {
  if (!template) return null

  const templateConfig = {
    standard: 'bg-blue-100 text-blue-800',
    regulatory: 'bg-purple-100 text-purple-800',
    summary: 'bg-green-100 text-green-800',
    detailed: 'bg-orange-100 text-orange-800'
  }

  const templateLabels = {
    standard: 'Estándar',
    regulatory: 'Regulatorio',
    summary: 'Resumen',
    detailed: 'Detallado'
  }

  const colorClass = templateConfig[template] || templateConfig.standard
  const label = templateLabels[template] || template

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  )
}