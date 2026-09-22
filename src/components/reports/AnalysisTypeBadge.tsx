'use client'

import {
  getAnalysisTypeIndicator,
  type AnalysisType,
} from '@/config/analysisTypes'
import { cn } from '@/lib/utils'

/**
 * Clases completas (no interpoladas) para que Tailwind las emita.
 * El registro en src/config no está en el content path del bundler.
 */
const ANALYSIS_TYPE_BADGE_CLASS: Record<AnalysisType, string> = {
  virology: 'bg-sky-700 text-white',
  phytopatology: 'bg-green-600 text-white',
  bacteriology: 'bg-blue-600 text-white',
  nematology: 'bg-purple-600 text-white',
  early_detection: 'bg-yellow-600 text-white',
  default: 'bg-gray-500 text-white',
}

interface AnalysisTypeBadgeProps {
  testAreas?: string[] | null
  analysisType?: string | null
  className?: string
}

export default function AnalysisTypeBadge({
  testAreas,
  analysisType,
  className,
}: AnalysisTypeBadgeProps) {
  const indicator = getAnalysisTypeIndicator(testAreas, analysisType)
  const colorClasses =
    ANALYSIS_TYPE_BADGE_CLASS[indicator.key as AnalysisType] ??
    `${indicator.bgColor} ${indicator.textColor}`

  return (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow-sm',
        colorClasses,
        className
      )}
      title={indicator.label}
      aria-label={`Tipo de análisis: ${indicator.label}`}
    >
      {indicator.initial}
    </div>
  )
}
