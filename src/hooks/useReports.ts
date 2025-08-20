import { useState, useEffect } from 'react'
import { ReportTemplate, Report } from '@/types/database'

export function useReports() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTemplates = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/reports/templates')
      if (!response.ok) throw new Error('Failed to fetch templates')
      const data = await response.json()
      setTemplates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const renderReport = async (
    sampleId: string, 
    templateCode: string, 
    version?: number
  ): Promise<Report> => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/reports/${sampleId}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_code: templateCode, version })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to render report')
      }
      
      const report = await response.json()
      return report
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const fetchReportsForSample = async (sampleId: string): Promise<Report[]> => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/reports/${sampleId}/render`)
      if (!response.ok) throw new Error('Failed to fetch reports')
      const reports = await response.json()
      return reports
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const createTemplate = async (templateData: {
    code: string
    name: string
    file_url?: string
    schema_json?: Record<string, unknown>
  }): Promise<ReportTemplate> => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/reports/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create template')
      }
      
      const template = await response.json()
      await fetchTemplates() // Refresh templates list
      return template
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    renderReport,
    fetchReportsForSample,
    createTemplate
  }
}