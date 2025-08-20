'use client'

import { useState } from 'react'
import { useReports } from '@/hooks/useReports'
import { Report } from '@/types/database'

interface ReportGeneratorProps {
  sampleId: string
  onReportGenerated?: (report: Report) => void
}

export function ReportGenerator({ sampleId, onReportGenerated }: ReportGeneratorProps) {
  const { templates, loading, error, renderReport } = useReports()
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>()
  const [generating, setGenerating] = useState(false)

  const handleGenerateReport = async () => {
    if (!selectedTemplate) return

    setGenerating(true)
    try {
      const report = await renderReport(sampleId, selectedTemplate, selectedVersion)
      onReportGenerated?.(report)
    } catch (err) {
      console.error('Failed to generate report:', err)
    } finally {
      setGenerating(false)
    }
  }

  const selectedTemplateData = templates.find(t => t.code === selectedTemplate)
  const availableVersions = templates
    .filter(t => t.code === selectedTemplate)
    .map(t => t.version)
    .sort((a, b) => b - a)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando plantillas...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-700">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar Plantilla
        </label>
        <select
          id="template"
          value={selectedTemplate}
          onChange={(e) => {
            setSelectedTemplate(e.target.value)
            setSelectedVersion(undefined)
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={generating}
        >
          <option value="">-- Seleccionar plantilla --</option>
          {templates.map((template) => (
            <option key={`${template.code}-${template.version}`} value={template.code}>
              {template.name} (v{template.version})
            </option>
          ))}
        </select>
      </div>

      {selectedTemplate && availableVersions.length > 1 && (
        <div>
          <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-2">
            Versión (opcional)
          </label>
          <select
            id="version"
            value={selectedVersion || ''}
            onChange={(e) => setSelectedVersion(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={generating}
          >
            <option value="">-- Última versión --</option>
            {availableVersions.map((version) => (
              <option key={version} value={version}>
                Versión {version}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedTemplateData && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
          <h4 className="font-medium text-gray-900">{selectedTemplateData.name}</h4>
          <p className="text-sm text-gray-600 mt-1">
            Código: {selectedTemplateData.code} | Versión: {selectedTemplateData.version}
          </p>
          {selectedTemplateData.schema_json && (
            <div className="mt-2">
              <p className="text-xs text-gray-500">Configuración disponible</p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleGenerateReport}
          disabled={!selectedTemplate || generating}
          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generando...
            </>
          ) : (
            'Generar Reporte'
          )}
        </button>
      </div>
    </div>
  )
}