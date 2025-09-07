'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  X, 
  FileText, 
  User, 
  Building2, 
  Calendar,
  TestTube,
  Microscope,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  Phone,
  Mail,
  MapPin
} from 'lucide-react'
import Image from 'next/image'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Keyboard } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import '@/styles/pdf-modal.css'

interface ReportData {
  id: string
  created_at: string
  status: string
  template: string
  include_recommendations: boolean
  include_images: boolean
  test_areas: string[]
  clients: {
    id: string
    name: string
    rut: string
    contact_email?: string
    contact_phone?: string
    address?: string
  }
  results: Array<{
    id: string
    status: string
    result_type: string
    diagnosis?: string
    conclusion?: string
    recommendations?: string
    pathogen_identified?: string
    pathogen_type?: string
    severity?: string
    confidence?: string
    methodology?: string
    findings?: Record<string, unknown>
    test_area?: string
    created_at: string
    samples: {
      id: string
      code: string
      species: string
      variety?: string
      received_date: string
    }
    sample_tests?: {
      id: string
      test_catalog?: {
        id: string
        name: string
        code: string
        area: string
        description?: string
      }
      methods?: {
        id: string
        name: string
        code: string
        description?: string
      }
    }
    performed_by_user?: {
      id: string
      name: string
      email: string
    }
    validated_by_user?: {
      id: string
      name: string
      email: string
    }
  }>
  generated_by_user?: {
    id: string
    name: string
    email: string
  }
  responsible_user?: {
    id: string
    name: string
    email: string
  }
}

interface ViewReportModalProps {
  isOpen: boolean
  onClose: () => void
  reportId: string | null
}

export default function ViewReportModal({ isOpen, onClose, reportId }: ViewReportModalProps) {
  const [report, setReport] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const fetchReport = useCallback(async () => {
    if (!reportId) return

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/reports/view/${reportId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch report details')
      }
      
      const data = await response.json()
      setReport(data)
    } catch (error) {
      console.error('Error fetching report:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar el informe')
    } finally {
      setIsLoading(false)
    }
  }, [reportId])

  useEffect(() => {
    if (isOpen && reportId) {
      fetchReport()
    } else {
      setReport(null)
      setError(null)
    }
  }, [isOpen, reportId, fetchReport])

  const generatePDF = async () => {
    if (!report) return

    try {
      setIsGeneratingPDF(true)
      
      // Find all PDF pages in the carousel
      const pdfPages = document.querySelectorAll('.pdf-page')
      if (pdfPages.length === 0) {
        throw new Error('No se encontraron páginas para generar el PDF')
      }

      // Create PDF in A4 format
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pdfWidth = 210 // A4 width in mm
      const pdfHeight = 297 // A4 height in mm

      // Process each page
      for (let i = 0; i < pdfPages.length; i++) {
        const page = pdfPages[i] as HTMLElement
        
        // Temporarily show the page if it's not visible (in case Swiper hides it)
        const originalDisplay = page.style.display
        const originalVisibility = page.style.visibility
        page.style.display = 'block'
        page.style.visibility = 'visible'

        // Capture the page with html2canvas
        const canvas = await html2canvas(page, {
          scale: 2, // Higher resolution
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: 794, // Fixed A4 width in pixels
          height: 1123, // Fixed A4 height in pixels
          scrollX: 0,
          scrollY: 0
        })

        // Restore original visibility
        page.style.display = originalDisplay
        page.style.visibility = originalVisibility

        const imgData = canvas.toDataURL('image/jpeg', 0.95)

        // Add page to PDF (add new page if not the first one)
        if (i > 0) {
          pdf.addPage()
        }

        // Add the image to fit exactly A4 dimensions
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
      }

      // Generate filename
      const clientName = report.clients.name.replace(/[^a-zA-Z0-9]/g, '_')
      const reportNumber = report.id.slice(-8).toUpperCase()
      const filename = `Informe_${reportNumber}_${clientName}.pdf`

      pdf.save(filename)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error al generar el PDF. Por favor, intente nuevamente.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const getResultTypeBadge = (resultType: string) => {
    const typeConfig = {
      positive: { class: 'badge-positive', text: 'POSITIVO', icon: AlertCircle },
      negative: { class: 'badge-negative', text: 'NEGATIVO', icon: CheckCircle },
      inconclusive: { class: 'badge-inconclusive', text: 'NO CONCLUSIVO', icon: XCircle }
    }
    
    const config = typeConfig[resultType as keyof typeof typeConfig] || typeConfig.inconclusive
    const IconComponent = config.icon
    
    return (
      <span className={`result-badge ${config.class}`}>
        <IconComponent className="h-4 w-4 mr-1" />
        {config.text}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Group results by test area/type
  const groupResultsByType = (results: ReportData['results']) => {
    const grouped: Record<string, ReportData['results']> = {}
    
    results.forEach(result => {
      const testType = result.test_area || result.sample_tests?.test_catalog?.area || 'general'
      if (!grouped[testType]) {
        grouped[testType] = []
      }
      grouped[testType].push(result)
    })
    
    return grouped
  }

  // Check if results have mixed types
  const hasMixedTypes = (results: ReportData['results']) => {
    const types = new Set(results.map(r => r.test_area || r.sample_tests?.test_catalog?.area || 'general'))
    return types.size > 1
  }

  // Get descriptive title for analysis type
  const getAnalysisTitle = (testType: string) => {
    console.log('Original testType:', testType)
    const normalizedType = testType.toLowerCase().trim()
    console.log('Normalized testType:', normalizedType)
    
    const titleMap: Record<string, string> = {
      'virologia': 'VIROLÓGICO',
      'nematologia': 'NEMATOLÓGICO', 
      'fitopatologia': 'FITOPATOLÓGICO',
      'fitopatología': 'FITOPATOLÓGICO',
      'bacteriologia': 'BACTERIOLÓGICO',
      'micologia': 'MICOLÓGICO',
      'entomologia': 'ENTOMOLÓGICO',
      'general': 'FITOSANITARIO'
    }
    
    // Try exact match first
    if (titleMap[normalizedType]) {
      console.log('Exact match found:', titleMap[normalizedType])
      return titleMap[normalizedType]
    }
    
    // Try partial matches for common variations
    if (normalizedType.includes('vir')) return 'VIROLÓGICO'
    if (normalizedType.includes('nemat')) return 'NEMATOLÓGICO'
    if (normalizedType.includes('fitopat') || normalizedType.includes('fitopato')) {
      console.log('Partial match found: FITOPATOLÓGICO')
      return 'FITOPATOLÓGICO'
    }
    if (normalizedType.includes('bacter')) return 'BACTERIOLÓGICO'
    if (normalizedType.includes('mic') || normalizedType.includes('hong')) return 'MICOLÓGICO'
    if (normalizedType.includes('entom') || normalizedType.includes('insect')) return 'ENTOMOLÓGICO'
    
    // Default fallback
    console.log('Using fallback for:', testType)
    return testType.toUpperCase().replace(/[_\s]+/g, ' ')
  }

  // Function to create pages for PDF preview
  const createReportPages = () => {
    if (!report) return []

    const mixedTypes = hasMixedTypes(report.results)
    const pages: React.JSX.Element[] = []

    if (mixedTypes) {
      // Mixed type report - each analysis type gets its own complete report
      const groupedResults = groupResultsByType(report.results)
      
      Object.entries(groupedResults).forEach(([testType, results], reportIndex) => {
        // Each analysis type might need multiple pages
        const reportPages = createSingleReportPages(testType, results, reportIndex)
        pages.push(...reportPages)
      })
    } else {
      // Single type report
      const testType = report.results[0]?.test_area || report.results[0]?.sample_tests?.test_catalog?.area || 'general'
      const reportPages = createSingleReportPages(testType, report.results, 0)
      pages.push(...reportPages)
    }

    return pages
  }

  // Function to create pages for a single report type
  const createSingleReportPages = (testType: string, results: ReportData['results'], reportIndex: number) => {
    if (!report) return []
    
    const pages: React.JSX.Element[] = []
    
    // Page 1: Header + Client Info + Sample Info (partial if many samples)
    pages.push(
      <div key={`page-${reportIndex}-1`} className="pdf-page">
        <div className="pdf-content">
          {/* Company Header */}
          <div className="company-header-pdf">
            <div className="flex items-center justify-center mb-6">
              <Image
                src="https://mknzstzwhbfoyxzfudfw.supabase.co/storage/v1/object/public/images/ORG_logo_NEMACHILE_(R)_01.08.23.ai.png"
                alt="Logo del Laboratorio"
                width={200}
                height={80}
                className="h-auto mr-6"
              />
              <div className="text-left">
                <h2 className="text-xl font-bold text-gray-900">Laboratorio de Análisis Agrícolas</h2>
                <p className="text-sm text-gray-600">Las Bandurrias, Parcela 6, Lote 8, Pirque, Santiago</p>
                <p className="text-sm text-gray-600">Fono: +56 2 32481820</p>
                <p className="text-sm text-blue-600">www.nemachile.cl</p>
              </div>
            </div>
          </div>

          {/* Report Title */}
          <div className="text-center border-b-2 border-blue-600 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              INFORME DE ANÁLISIS {getAnalysisTitle(testType)}
            </h1>
            <p className="text-base text-gray-600">
              Informe N° {report.id.slice(-8).toUpperCase()}{reportIndex > 0 ? `-${testType.toUpperCase().charAt(0)}` : ''}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Fecha de emisión: {formatDate(report.created_at)}
            </p>
          </div>

          {/* Client Information */}
          <section className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-3">
              <Building2 className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-bold text-gray-900">1. IDENTIFICACIÓN DEL CLIENTE</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                  <p className="text-sm font-semibold text-gray-900">{report.clients.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
                  <p className="text-sm text-gray-900">{report.clients.rut || 'No especificado'}</p>
                </div>
              </div>
              <div className="space-y-2">
                {report.clients.contact_email && (
                  <div className="flex items-center text-sm text-gray-900">
                    <Mail className="h-3 w-3 text-gray-400 mr-2" />
                    {report.clients.contact_email}
                  </div>
                )}
                {report.clients.contact_phone && (
                  <div className="flex items-center text-sm text-gray-900">
                    <Phone className="h-3 w-3 text-gray-400 mr-2" />
                    {report.clients.contact_phone}
                  </div>
                )}
                {report.clients.address && (
                  <div className="flex items-start text-sm text-gray-900">
                    <MapPin className="h-3 w-3 text-gray-400 mr-2 mt-0.5" />
                    {report.clients.address}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Sample Information - First few samples */}
          <section className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <TestTube className="h-5 w-5 text-green-600 mr-2" />
              <h2 className="text-lg font-bold text-gray-900">2. IDENTIFICACIÓN DE MUESTRAS</h2>
            </div>
            <div className="space-y-3">
              {results.slice(0, 3).map((result, index) => (
                <div key={result.id} className="bg-white rounded p-3 border text-sm">
                  <h3 className="font-semibold text-gray-900 mb-2">Muestra {index + 1}: {result.samples.code}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="font-medium text-gray-700">Especie:</span> {result.samples.species}
                    </div>
                    {result.samples.variety && (
                      <div>
                        <span className="font-medium text-gray-700">Variedad:</span> {result.samples.variety}
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-700">Fecha:</span> {formatDate(result.samples.received_date)}
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Análisis:</span> {result.sample_tests?.test_catalog?.name || 'No especificado'}
                    </div>
                  </div>
                </div>
              ))}
              {results.length > 3 && (
                <p className="text-sm text-gray-600 italic">Continúa en página siguiente...</p>
              )}
            </div>
          </section>
        </div>
      </div>
    )

    // Additional pages for remaining samples, results, and diagnosis
    if (results.length > 3) {
      // Page 2: Remaining samples + Results
      pages.push(
        <div key={`page-${reportIndex}-2`} className="pdf-page">
          <div className="pdf-content">
            {/* Remaining samples */}
            {results.length > 3 && (
              <section className="bg-gray-50 rounded-lg p-4 mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">2. MUESTRAS (continuación)</h2>
                <div className="space-y-3">
                  {results.slice(3).map((result, index) => (
                    <div key={result.id} className="bg-white rounded p-3 border text-sm">
                      <h3 className="font-semibold text-gray-900 mb-2">Muestra {index + 4}: {result.samples.code}</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="font-medium text-gray-700">Especie:</span> {result.samples.species}
                        </div>
                        {result.samples.variety && (
                          <div>
                            <span className="font-medium text-gray-700">Variedad:</span> {result.samples.variety}
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-gray-700">Fecha:</span> {formatDate(result.samples.received_date)}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Análisis:</span> {result.sample_tests?.test_catalog?.name || 'No especificado'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Results Section */}
            <section className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <Microscope className="h-5 w-5 text-yellow-600 mr-2" />
                <h2 className="text-lg font-bold text-gray-900">3. TIPO DE RESULTADO</h2>
              </div>
              <div className="space-y-3">
                {results.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">Muestra: {result.samples.code} - {result.samples.species}</p>
                      {result.pathogen_identified && (
                        <p className="text-gray-600 mt-1">
                          Patógeno identificado: <span className="font-medium">{result.pathogen_identified}</span>
                        </p>
                      )}
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {getResultTypeBadge(result.result_type)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )
    } else {
      // If few samples, add results to page 1 by creating a new page
      pages.push(
        <div key={`page-${reportIndex}-results`} className="pdf-page">
          <div className="pdf-content">
            <section className="bg-yellow-50 rounded-lg p-4 mb-6">
              <div className="flex items-center mb-3">
                <Microscope className="h-5 w-5 text-yellow-600 mr-2" />
                <h2 className="text-lg font-bold text-gray-900">3. TIPO DE RESULTADO</h2>
              </div>
              <div className="space-y-3">
                {results.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">Muestra: {result.samples.code} - {result.samples.species}</p>
                      {result.pathogen_identified && (
                        <p className="text-gray-600 mt-1">
                          Patógeno identificado: <span className="font-medium">{result.pathogen_identified}</span>
                        </p>
                      )}
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      {getResultTypeBadge(result.result_type)}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Start Diagnosis section */}
            <section className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <FileText className="h-5 w-5 text-green-600 mr-2" />
                <h2 className="text-lg font-bold text-gray-900">4. DIAGNÓSTICO Y CONCLUSIONES</h2>
              </div>
              <div className="space-y-3">
                {results.slice(0, 1).map((result) => (
                  <div key={result.id} className="bg-white rounded border p-3">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm">Muestra: {result.samples.code}</h3>
                    <div className="space-y-3 text-sm">
                      {result.diagnosis && (
                        <div>
                          <label className="block font-bold text-gray-700 mb-1">DIAGNÓSTICO</label>
                          <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">{result.diagnosis}</p>
                        </div>
                      )}
                      {result.conclusion && (
                        <div>
                          <label className="block font-bold text-gray-700 mb-1">CONCLUSIÓN</label>
                          <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">{result.conclusion}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )
    }

    // Final page with remaining diagnosis and footer
    pages.push(
      <div key={`page-${reportIndex}-final`} className="pdf-page">
        <div className="pdf-content">
          <section className="bg-green-50 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-3">
              <FileText className="h-5 w-5 text-green-600 mr-2" />
              <h2 className="text-lg font-bold text-gray-900">4. DIAGNÓSTICO Y CONCLUSIONES (continuación)</h2>
            </div>
            <div className="space-y-3">
              {results.slice(1).map((result) => (
                <div key={result.id} className="bg-white rounded border p-3">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">Muestra: {result.samples.code}</h3>
                  <div className="space-y-3 text-sm">
                    {result.diagnosis && (
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">DIAGNÓSTICO</label>
                        <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">{result.diagnosis}</p>
                      </div>
                    )}
                    {result.conclusion && (
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">CONCLUSIÓN</label>
                        <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">{result.conclusion}</p>
                      </div>
                    )}
                    {result.recommendations && (
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">RECOMENDACIONES</label>
                        <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">{result.recommendations}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Footer */}
          <section className="border-t-2 border-gray-300 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Personal Responsable</h3>
                {results.slice(0, 2).map((result) => (
                  <div key={result.id} className="space-y-1 mb-3">
                    <p className="text-xs font-medium text-gray-700">Muestra: {result.samples.code}</p>
                    {result.performed_by_user && (
                      <div className="flex items-center text-xs">
                        <User className="h-3 w-3 text-gray-400 mr-1" />
                        <div>
                          <p className="font-medium text-gray-900">Realizado por: {result.performed_by_user.name}</p>
                          <p className="text-gray-500">{result.performed_by_user.email}</p>
                        </div>
                      </div>
                    )}
                    {result.validated_by_user && (
                      <div className="flex items-center text-xs">
                        <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                        <div>
                          <p className="font-medium text-gray-900">Validado por: {result.validated_by_user.name}</p>
                          <p className="text-gray-500">{result.validated_by_user.email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Información del Informe</h3>
                <div className="flex items-center mb-2 text-xs">
                  <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                  <p className="text-gray-900">Fecha de generación: {formatDate(report.created_at)}</p>
                </div>
                {report.generated_by_user && (
                  <div className="flex items-center text-xs">
                    <User className="h-3 w-3 text-gray-400 mr-1" />
                    <div>
                      <p className="text-gray-900">Generado por: {report.generated_by_user.name}</p>
                      <p className="text-gray-500">{report.generated_by_user.email}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    )

    return pages
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-start justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-top bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all my-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-200 sticky top-0 z-10" data-modal-header>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Informe de Análisis
                  </h3>
                  <p className="text-sm text-gray-500">
                    {report?.clients?.name} - {formatDate(report?.created_at || '')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={generatePDF}
                  disabled={isGeneratingPDF || !report}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {isGeneratingPDF ? 'Generando PDF...' : 'Descargar PDF'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-gray-100 px-4 py-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Cargando informe...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Error al cargar</h3>
                <p className="mt-1 text-sm text-gray-500">{error}</p>
                <button
                  onClick={fetchReport}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  Reintentar
                </button>
              </div>
            ) : report ? (
              <div className="pdf-carousel-container">
                <Swiper
                  modules={[Navigation, Pagination, Keyboard]}
                  spaceBetween={30}
                  slidesPerView={1}
                  navigation
                  pagination={{ 
                    clickable: true,
                    dynamicBullets: true
                  }}
                  keyboard={{
                    enabled: true,
                  }}
                  className="pdf-swiper"
                >
                  {createReportPages().map((page, index) => (
                    <SwiperSlide key={index} className="pdf-slide">
                      {page}
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Informe no encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  El informe solicitado no se pudo encontrar.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}