import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Types for PDF template configuration
type AnalysisType = 'virology' | 'phytopatology' | 'bacteriology' | 'nematology' | 'default'

interface ReportData {
  id: string
  created_at: string
  client_id: string | null
  test_areas: string[] | null
  analysis_type?: string // Future field
}

interface ClientData {
  id: string
  name?: string | null
  address?: string | null
  contact_email?: string | null
  phone?: string | null
  rut?: string | null
}

interface TemplateConfig {
  templateId: string
  payloadBuilder: (report: ReportData, client: ClientData | null, resultado?: ResultadoData, analystName?: string) => Record<string, unknown>
}

interface ResultadoData {
  id: string
  sample_id: string
  test_area: string
  result_type: 'positive' | 'negative'
  findings: Record<string, unknown>
  methodology: string | null
  performed_by: string
  performed_at: string
  validated_by: string
  validation_date: string
  conclusion: string | null
  diagnosis: string | null
  recommendations: string | null
  report_id: string | null
  samples?: {
    id: string
    code: string
    species: string | null
    variety: string | null
    rootstock: string | null
    planting_year: number | null
    received_date: string | null
  } | null
}

// Analysis defaults for different test types
const ANALYSIS_DEFAULTS = {
  nematologia: {
    tituloInforme: "INFORME NEMATOLÓGICO",
    tipoAnalisisDescripcion: "Determinación de nematodos fitoparásitos de formas móviles y enquistadas en suelo.",
    metodologiaDescripcion: "Para la determinación de nematodos fitoparásitos en formas móviles se utilizó el Método de Tamizado de Cobb y Embudo de Baermann. Con respecto a la determinación de formas enquistadas se utilizó el método de Fenwick."
  },
  virology: {
    tituloInforme: "INFORME VIROLÓGICO",
    tipoAnalisisDescripcion: "Determinación de virus fitopatógenos.",
    metodologiaDescripcion: "Metodología estándar para análisis virológico."
  },
  phytopatology: {
    tituloInforme: "INFORME FITOPATOLÓGICO", 
    tipoAnalisisDescripcion: "Determinación de patógenos vegetales.",
    metodologiaDescripcion: "Se efectuaron tres diluciones (10⁻¹, 10⁻² y 10⁻³) de cada muestra de suelo previamente tamizadas. Posteriormente se extrajo 1 ml de cada dilución, sembrándolas en placas de Petri con medios de cultivos específicos para el desarrollo de hongos. Después del período de incubación, se hizo el recuento del número de colonias presentes en las placas correspondientes a las tres diluciones de cada muestra de suelo. Los resultados se expresan en número de colonias de hongos por muestra analizada."
  }
}

// PDF Templates mapping - easily extensible for new analysis types
const PDF_TEMPLATES: Record<AnalysisType, TemplateConfig> = {
  virology: {
    templateId: '0D6C351F-BFFF-4FFF-8960-59763FA3018F',
    payloadBuilder: (report, client, resultado, analystName) => {
      const currentDate = new Date()

      const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
      }

      let findings = resultado?.findings as unknown
      if (typeof findings === 'string') {
        try { findings = JSON.parse(findings) } catch { findings = undefined }
      }
      const tests = Array.isArray((findings as Record<string, unknown>)?.tests) ? (findings as Record<string, unknown>).tests as unknown[] : []

      const identificationTechniques: string[] = Array.isArray((findings as Record<string, unknown>)?.identification_techniques)
        ? (findings as Record<string, unknown>).identification_techniques as string[]
        : []
      const methodNames = Array.from(new Set((tests || []).map((t: unknown) => (t as Record<string, unknown>).method as string).filter(Boolean)))
      const tecnicaUtilizadaDesc = identificationTechniques.length > 0
        ? identificationTechniques.join(' y ')
        : (methodNames.length > 0 ? methodNames.join(' y ') : 'No especificado')

      const virusNames = Array.from(new Set((tests || []).map((t: unknown) => (t as Record<string, unknown>).virus as string).filter(Boolean)))
      const tipoAnalisisDesc = virusNames.length === 1
        ? `Determinación del virus ${virusNames[0]}`
        : 'Determinación de virus fitopatógenos'

      const resultados = (tests || []).map((t: unknown, idx: number) => {
        const test = t as Record<string, unknown>
        return {
          muestra: resultado?.sample_id || String(idx + 1),
          identificacion: (test.identification as string) || `Muestra ${idx + 1}`,
          tecnicaUtilizada: (test.method as string) || 'No especificado',
          virusAnalizado: (test.virus as string) || 'No especificado',
          resultado: test.result === 'positive' ? 'Positivo' : (test.result === 'negative' ? 'Negativo' : 'No conclusivo')
        }
      })

      const reportNumber = `${currentDate.getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`

      return {
        numeroInforme: reportNumber,
        tituloInforme: 'INFORME ANÁLISIS VIROLÓGICO',
        informacionSolicitante: {
          nombreRazonSocial: client?.name || 'Cliente no especificado',
          contacto: client?.contact_email || '',
          telefono: client?.phone || '',
          localidad: client?.address || 'No especificada',
          rut: client?.rut || '',
          numeroMuestras: '1',
          fechaRecepcion: resultado?.performed_at ? formatDate(resultado.performed_at) : formatDate(currentDate.toISOString()),
          fechaEntrega: resultado?.validation_date ? formatDate(resultado.validation_date) : formatDate(currentDate.toISOString())
        },
        tipoAnalisis: { descripcion: tipoAnalisisDesc },
        tecnicaUtilizada: { descripcion: tecnicaUtilizadaDesc },
        procedimientoMuestreo: {
          procedimientoUtilizado: '----------',
          personaTomoMuestra: resultado?.performed_by ? 'Muestras tomadas por laboratorio' : 'Muestras tomadas por cliente'
        },
        informacionGeneral: {
          especie: (resultado as ResultadoData)?.samples?.species || 'No especificado',
          cuartel: '',
          variedadPortainjerto: (resultado as ResultadoData)?.samples?.variety || '',
          anoPlantacion: (resultado as ResultadoData)?.samples?.planting_year ? String((resultado as ResultadoData).samples!.planting_year) : '',
          organoAnalizado: ''
        },
        resultados,
        leyendaResultados: {
          negativo: virusNames.length === 1 ? `Resultado de análisis negativo a ${virusNames[0]}` : 'Resultado de análisis negativo',
          positivo: virusNames.length === 1 ? `Resultado de análisis positivo a ${virusNames[0]}` : 'Resultado de análisis positivo'
        },
        analista: {
          nombre: analystName || 'Analista',
          titulo: 'Ing. Agrónomo',
          departamento: 'Laboratorio Virología',
          email: ''
        }
      }
    }
  },
  
  bacteriology: {
    templateId: 'BFFA2B14-DA47-4D06-B593-0CC084D374C6',
    payloadBuilder: (report, client, resultado, analystName) => {
      const currentDate = new Date()

      // Helpers
      const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
      }

      // Findings can be string or object
      let findings = resultado?.findings as unknown
      if (typeof findings === 'string') {
        try {
          findings = JSON.parse(findings)
        } catch {
          findings = undefined
        }
      }

      // Collect tests (identification, method, microorganism, result)
      const tests = Array.isArray((findings as Record<string, unknown>)?.tests) ? (findings as Record<string, unknown>).tests as unknown[] : []

      // numeroInforme: YYYY-<random 3 digits>
      const reportNumber = `${currentDate.getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`

      // tecnica utilizada: prefer identification_techniques, else distinct methods
      const identificationTechniques: string[] = Array.isArray((findings as Record<string, unknown>)?.identification_techniques)
        ? (findings as Record<string, unknown>).identification_techniques as string[]
        : []
      const methodNames = Array.from(new Set((tests || []).map((t: unknown) => (t as Record<string, unknown>).method as string).filter(Boolean)))
      const tecnicaUtilizadaDesc = identificationTechniques.length > 0
        ? identificationTechniques.join(' y ')
        : (methodNames.length > 0 ? methodNames.join(' y ') : 'No especificado')

      // tipoAnalisis descripcion: usar bacteria única si posible
      const bacteriaNames = Array.from(new Set((tests || []).map((t: unknown) => (t as Record<string, unknown>).microorganism as string).filter(Boolean)))
      const tipoAnalisisDesc = bacteriaNames.length === 1
        ? `Determinación de ${bacteriaNames[0]}`
        : 'Determinación de bacterias fitopatógenas'

      // resultados array
      const resultados = (tests || []).map((t: unknown, idx: number) => {
        const test = t as Record<string, unknown>
        return {
          muestra: resultado?.sample_id || String(idx + 1),
          identificacion: (test.identification as string) || `Muestra ${idx + 1}`,
          tecnicaUtilizada: (test.method as string) || 'No especificado',
          bacteriaAnalizada: (test.microorganism as string) || 'No especificada',
          resultado: test.result === 'positive' ? 'Positivo' : (test.result === 'negative' ? 'Negativo' : 'No conclusivo')
        }
      })

      return {
        numeroInforme: reportNumber,
        tituloInforme: 'INFORME ANÁLISIS BACTERIOLÓGICO',
        informacionSolicitante: {
          nombreRazonSocial: client?.name || 'Cliente no especificado',
          contacto: client?.contact_email || '',
          telefono: client?.phone || '',
          localidad: client?.address || 'No especificada',
          rut: client?.rut || '',
          numeroMuestras: '1',
          fechaRecepcion: resultado?.performed_at ? formatDate(resultado.performed_at) : formatDate(currentDate.toISOString()),
          fechaEntrega: resultado?.validation_date ? formatDate(resultado.validation_date) : formatDate(currentDate.toISOString())
        },
        tipoAnalisis: {
          descripcion: tipoAnalisisDesc
        },
        tecnicaUtilizada: {
          descripcion: tecnicaUtilizadaDesc
        },
        procedimientoMuestreo: {
          procedimientoUtilizado: '----------',
          personaTomoMuestra: resultado?.performed_by ? 'Muestras tomadas por laboratorio' : 'Muestras tomadas por cliente'
        },
        informacionGeneral: {
          especie: resultado?.samples?.species || 'No especificado',
          cuartel: '',
          variedadPortainjerto: resultado?.samples?.variety || '',
          anoPlantacion: resultado?.samples?.planting_year ? String(resultado.samples.planting_year) : '',
          organoAnalizado: ''
        },
        resultados,
        leyendaResultados: {
          negativo: 'Resultado de análisis negativo a la(s) bacteria(s) analizada(s)',
          positivo: 'Resultado de análisis positivo a la(s) bacteria(s) analizada(s)'
        },
        analista: {
          nombre: analystName || 'Analista',
          titulo: 'Ing. Agrónomo',
          departamento: 'Laboratorio Bacteriología',
          email: ''
        }
      }
    }
  },
  
  phytopatology: {
    templateId: '5AA9EEB6-73F7-4370-AF58-F932A541100B', // Phytopatology template ID
    payloadBuilder: (report, client, resultado, analystName) => {
      const defaults = ANALYSIS_DEFAULTS.phytopatology
      const currentDate = new Date()
      
      // Generate report number
      const reportNumber = `${currentDate.getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
      
      // Format dates
      const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('es-CL', { 
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      }
      
      // Extract microorganisms data from findings
      let resultados: Array<{numeroMuestra: string, identificacionMuestra: string, microorganismos: Array<{nombre: string, dilucion10_1: number, dilucion10_2: number, dilucion10_3: number}>}> = []
      
      // Handle findings - might be JSON string or object
      let findings = resultado?.findings
      if (typeof findings === 'string') {
        try {
          findings = JSON.parse(findings)
        } catch {
          findings = undefined
        }
      }
      
      if (findings && typeof findings === 'object' && findings.tests && Array.isArray(findings.tests)) {
        // Group microorganisms by sample (each test represents one sample)
        findings.tests.forEach((test: {microorganism?: string, dilutions?: Record<string, string>, identification?: string}, index: number) => {
          const microorganismos: Array<{nombre: string, dilucion10_1: number, dilucion10_2: number, dilucion10_3: number}> = []
          
          if (test.microorganism && test.dilutions) {
            microorganismos.push({
              nombre: test.microorganism,
              dilucion10_1: parseInt(test.dilutions['10-1']) || 0,
              dilucion10_2: parseInt(test.dilutions['10-2']) || 0,  
              dilucion10_3: parseInt(test.dilutions['10-3']) || 0
            })
          }
          
          resultados.push({
            numeroMuestra: (index + 1).toString(),
            identificacionMuestra: test.identification || `Muestra ${index + 1}`,
            microorganismos: microorganismos
          })
        })
      }
      
      // If no results found, add default entry
      if (resultados.length === 0) {
        resultados = [{
          numeroMuestra: "1",
          identificacionMuestra: "Muestra 1",
          microorganismos: [{
            nombre: "No se detectaron microorganismos",
            dilucion10_1: 0,
            dilucion10_2: 0,
            dilucion10_3: 0
          }]
        }]
      }

      return {
        numeroInforme: reportNumber,
        tituloInforme: defaults.tituloInforme,
        informacionSolicitante: {
          productor: client?.name || 'Cliente no especificado',
          rut: client?.rut || '--------',
          contacto: client?.contact_email || 'No especificado',
          telefono: client?.phone || 'No especificado',
          localidad: client?.address || 'No especificada',
          fechaRecepcion: resultado?.performed_at ? formatDate(resultado.performed_at) : formatDate(currentDate.toISOString()),
          fechaInforme: resultado?.validation_date ? formatDate(resultado.validation_date) : formatDate(currentDate.toISOString()),
          numeroMuestras: resultados.length.toString()
        },
        tipoMuestra: {
          descripcion: resultado?.conclusion || 'Muestra de suelo para análisis fitopatológico. Recuento de colonias.'
        },
        metodologia: {
          descripcion: resultado?.methodology || defaults.metodologiaDescripcion
        },
        resultados: resultados,
        diagnostico: {
          descripcion: resultado?.diagnosis || resultado?.conclusion || 'Análisis fitopatológico completado. Los microorganismos identificados corresponden a la flora natural del suelo.'
        },
        notaResultados: 'Los resultados solamente son válidos sólo para las muestras analizadas las que fueron proporcionadas por el cliente.',
        analista: {
          nombre: analystName || 'Blancaluz Pinilla C.',
          titulo: 'Ingeniero Agrónomo, M.Sc.', // Default title
          departamento: 'Laboratorio Fitopatología',
          email: 'blancaluzpinilla@nemachile.cl'
        }
      }
    }
  },
  
  nematology: {
    templateId: '1D6880A8-BEDA-4538-86CA-4121557E88FE',
    payloadBuilder: (report, client, resultado, analystName) => {
      const defaults = ANALYSIS_DEFAULTS.nematologia
      const currentDate = new Date()
      
      // Generate report number
      const reportNumber = `NEM-${currentDate.getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
      
      // Format dates
      const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
      }
      
      // Extract nematodes from findings
      let nematodes: Array<{ generoEspecie: string; cantidad: string }> = []
      
      // Handle findings - might be JSON string or object
      let findings = resultado?.findings
      if (typeof findings === 'string') {
        try {
          findings = JSON.parse(findings)
        } catch {
          findings = undefined
        }
      }
      
      if (findings && typeof findings === 'object' && findings.nematodes && Array.isArray(findings.nematodes)) {
        nematodes = findings.nematodes.map((nem: {name?: string, quantity?: string, generoEspecie?: string, cantidad?: string}) => ({
          generoEspecie: nem.name || nem.generoEspecie || 'No especificado',
          cantidad: nem.quantity || nem.cantidad || '0'
        }))
      }
      
      // If no nematodes found, add default entry
      if (nematodes.length === 0) {
        nematodes = [
          { generoEspecie: 'No se encontraron nematodos', cantidad: '0' }
        ]
      }

      return {
        numeroInforme: reportNumber,
        tituloInforme: defaults.tituloInforme,
        informacionSolicitante: {
          nombreRazonSocial: client?.name || 'Cliente no especificado',
          rut: client?.rut || '--------',
          contacto: client?.contact_email || 'No especificado',
          telefono: client?.phone || 'No especificado',
          correo: client?.contact_email || 'No especificado',
          localidad: client?.address || 'No especificada',
          numeroMuestras: '1', // Default to 1 for now
          fechaRecepcion: resultado?.performed_at ? formatDate(resultado.performed_at) : formatDate(currentDate.toISOString()),
          fechaEntrega: resultado?.validation_date ? formatDate(resultado.validation_date) : formatDate(currentDate.toISOString())
        },
        tipoAnalisis: {
          descripcion: defaults.tipoAnalisisDescripcion
        },
        metodologia: {
          descripcion: resultado?.methodology || defaults.metodologiaDescripcion
        },
        procedimientoMuestreo: {
          procedimientoUtilizado: "----------",
          personaTomoMuestra: "Cliente"
        },
        resultados: [
          {
            numeroMuestra: "1",
            identificacionCliente: resultado?.sample_id || 'Muestra',
            codigoInterno: resultado?.id || report.id,
            nematodos: nematodes
          }
        ],
        conclusiones: {
          descripcion: resultado?.conclusion || 
                      resultado?.diagnosis || 
                      'La muestra analizada no presentó nematodos fitoparásitos, sólo nematodos de vida libre o benéficos.'
        },
        analista: {
          nombre: analystName || 'DRA. LUCIA RIVERA C.',
          titulo: 'Ing. Agrónomo MSc.', // Default title
          departamento: 'Nematóloga',
          email: ''
        }
      }
    }
  },
  
  default: {
    templateId: 'E7E87A76-10F7-4F3C-B45F-24BB7D06ED63', // Current default template
    payloadBuilder: (_report, client) => ({
      // Default payload structure (current implementation)
      reportNumber: 'LAB-2025-001',
      issueDate: '2025-09-08',
      clientName: client?.name || 'Cliente no especificado',
      clientAddress: client?.address || 'Dirección no especificada',
      clientContact: client?.contact_email || client?.phone || 'Contacto no especificado',
      sampleId: 'M-12345',
      sampleReceptionDate: '2025-09-05',
      sampleType: 'Suelo agrícola',
      results: [
        { name: 'pH', method: 'Potenciómetro', value: '6.2', unit: '-', reference: '5.5 - 7.0' },
        { name: 'Materia orgánica', method: 'Combustión', value: '2.8', unit: '%', reference: '> 3.0' }
      ],
      observations: 'La muestra presenta un nivel ligeramente bajo de materia orgánica.',
      analystName: 'Dra. María González',
      analystTitle: 'Químico responsable'
    })
  }
}

/**
 * Resolves the correct template ID and payload based on analysis type
 * @param report - The report data from database
 * @param client - The client data from database
 * @param resultado - Optional resultado data from resultados table
 * @param analystName - The analyst's name
 * @returns Object containing templateId and payload
 */
function resolveTemplateAndPayload(report: ReportData, client: ClientData | null, resultado?: ResultadoData, analystName?: string): { templateId: string; payload: Record<string, unknown> } {
  // Determine analysis type from report data or resultado data
  let analysisType: AnalysisType = 'default'
  
  console.log('PDFMonkey: Resolving template and payload...')
  console.log('PDFMonkey: resultado?.test_area:', resultado?.test_area)
  console.log('PDFMonkey: report.test_areas:', report.test_areas)
  console.log('PDFMonkey: report.analysis_type:', report.analysis_type)
  
  // Option 1: Check resultado test_area first (most specific)
  if (resultado?.test_area) {
    const testArea = resultado.test_area.toLowerCase()
    console.log('PDFMonkey: Checking resultado test_area:', testArea)
    if (testArea.includes('nematolog')) {
      analysisType = 'nematology'
    } else if (testArea.includes('virus') || testArea.includes('viral') || testArea.includes('virolog')) {
      analysisType = 'virology'
    } else if (testArea.includes('fitopatolog') || testArea.includes('pathog') || testArea.includes('fung')) {
      analysisType = 'phytopatology'
    } else if (testArea.includes('bacter') || testArea.includes('bacteriolog')) {
      analysisType = 'bacteriology'
    }
  }
  // Option 2: Check for future analysis_type field
  else if (report.analysis_type) {
    const reportAnalysisType = report.analysis_type.toLowerCase()
    console.log('PDFMonkey: Checking report analysis_type:', reportAnalysisType)
    if (reportAnalysisType in PDF_TEMPLATES) {
      analysisType = reportAnalysisType as AnalysisType
    }
  }
  // Option 3: Infer from test_areas field
  else if (report.test_areas && Array.isArray(report.test_areas)) {
    const testAreasLower = report.test_areas.map(area => area.toLowerCase())
    console.log('PDFMonkey: Checking report test_areas:', testAreasLower)
    
    if (testAreasLower.some(area => area.includes('virus') || area.includes('viral') || area.includes('virolog'))) {
      analysisType = 'virology'
    } else if (testAreasLower.some(area => area.includes('fitopatolog') || area.includes('pathog') || area.includes('fung'))) {
      analysisType = 'phytopatology'
    } else if (testAreasLower.some(area => area.includes('nematod') || area.includes('nematolog'))) {
      analysisType = 'nematology'
    } else if (testAreasLower.some(area => area.includes('bacter') || area.includes('bacteriolog'))) {
      analysisType = 'bacteriology'
    }
  }
  
  console.log('PDFMonkey: Final analysis type:', analysisType)
  const templateConfig = PDF_TEMPLATES[analysisType]
  console.log('PDFMonkey: Using template ID:', templateConfig.templateId)
  
  return {
    templateId: templateConfig.templateId,
    payload: templateConfig.payloadBuilder(report, client, resultado, analystName)
  }
}

export async function GET() {
  // Lightweight health check to confirm the route is mounted
  return NextResponse.json({ ok: true, route: 'pdfmonkey' })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { result_id, report_id } = body || {}

    // Accept either result_id (preferred) or report_id for backward compatibility
    const targetId = result_id || report_id

    if (!targetId) {
      return NextResponse.json({ error: 'result_id or report_id is required' }, { status: 400 })
    }

    console.log('PDFMonkey: Processing request with targetId:', targetId, 'type:', result_id ? 'result_id' : 'report_id')

    // Initialize variables
    let report: ReportData | null = null
    let client: ClientData | null = null
    let resultado: ResultadoData | null = null

    if (result_id) {
      // If we have result_id, fetch the result directly and get report/client info from it
      const { data: resultData, error: resultError } = await supabase
        .from('results')
        .select('id, sample_id, test_area, result_type, findings, methodology, performed_by, performed_at, validated_by, validation_date, conclusion, diagnosis, recommendations, report_id, samples:sample_id (id, code, species, variety, rootstock, planting_year, received_date)')
        .eq('id', result_id)
        .single()
      
      if (resultError || !resultData) {
        console.warn('PDFMonkey: result not found or inaccessible', { result_id, resultError })
        return NextResponse.json({ error: 'Result not found' }, { status: 404 })
      }
      
      resultado = (resultData as unknown) as ResultadoData
      
      // Get report info if available
      if (resultData.report_id) {
        const { data: reportData } = await supabase
          .from('reports')
          .select('id, created_at, client_id, test_areas')
          .eq('id', resultData.report_id)
          .single()
        report = reportData
      }
      
      // Create minimal report structure if no report exists
      if (!report) {
        report = {
          id: result_id,
          created_at: resultData.performed_at || new Date().toISOString(),
          client_id: null,
          test_areas: [resultData.test_area]
        }
      }
    } else {
      // Legacy behavior: fetch report first, then try to find associated result
      const { data: reportData, error: reportError } = await supabase
        .from('reports')
        .select('id, created_at, client_id, test_areas')
        .eq('id', report_id)
        .single()

      if (reportError || !reportData) {
        console.warn('PDFMonkey: report not found or inaccessible', { report_id, reportError })
        return NextResponse.json({ error: 'Report not found' }, { status: 404 })
      }
      
      report = reportData

      // Try to fetch result data from results table using report_id
      const { data: resultData, error: resultError } = await supabase
        .from('results')
        .select('id, sample_id, test_area, result_type, findings, methodology, performed_by, performed_at, validated_by, validation_date, conclusion, diagnosis, recommendations, report_id, samples:sample_id (id, code, species, variety, rootstock, planting_year, received_date)')
        .eq('report_id', report_id)
        .single()
      
      if (resultError) {
        console.warn('PDFMonkey: result not found, using default payload', { report_id, resultError })
      } else {
        resultado = (resultData as unknown) as ResultadoData
      }
    }

    // Fetch client separately to avoid inner-join filtering
    if (report.client_id) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, name, address, contact_email, phone, rut')
        .eq('id', report.client_id)
        .single()
      client = clientData
    } else if (resultado?.sample_id) {
      // If no client from report, try to get it from the sample
      const { data: sampleData } = await supabase
        .from('samples')
        .select('client_id')
        .eq('id', resultado.sample_id)
        .single()
      
      if (sampleData?.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, name, address, contact_email, phone, rut')
          .eq('id', sampleData.client_id)
          .single()
        client = clientData
      }
    }

    console.log('PDFMonkey: Found result data:', JSON.stringify(resultado, null, 2))
    if (resultado?.findings) {
      console.log('PDFMonkey: Result findings raw:', resultado.findings)
      console.log('PDFMonkey: Result findings type:', typeof resultado.findings)
      
      // Handle case where findings might be a JSON string
      if (typeof resultado.findings === 'string') {
        try {
          resultado.findings = JSON.parse(resultado.findings)
          console.log('PDFMonkey: Parsed findings from string:', JSON.stringify(resultado.findings, null, 2))
        } catch (e) {
          console.error('PDFMonkey: Failed to parse findings JSON string:', e)
        }
      } else {
        console.log('PDFMonkey: Result findings structure:', JSON.stringify(resultado.findings, null, 2))
      }
    } else {
      console.log('PDFMonkey: No findings data found')
    }

    // Generate filename: client_name + test_areas + date
    const clientName = client?.name ? client.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Cliente'
    const testAreas = Array.isArray(report.test_areas) && report.test_areas.length > 0 
      ? report.test_areas.join('_').replace(/[^a-zA-Z0-9]/g, '_')
      : 'Analisis'
    const dateStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const filename = `${clientName}_${testAreas}_${dateStr}.pdf`

    // Fetch analyst name if we have resultado data
    let analystName = 'DRA. LUCIA RIVERA C.' // Default
    if (resultado?.validated_by) {
      const { data: userData } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', resultado.validated_by)
        .single()
      if (userData?.name) {
        analystName = userData.name
      }
    }

    // Dynamically resolve template and payload based on analysis type
    const { templateId, payload: templatePayload } = resolveTemplateAndPayload(report!, client, resultado || undefined, analystName)

    const payload: Record<string, unknown> = {
      document: {
        document_template_id: templateId,
        status: 'pending',
        payload: templatePayload,
        meta: {
          target_id: targetId,
          result_id: result_id || null,
          report_id: report_id || null,
          _filename: filename
        }
      }
    }

    console.log('STATUS DEBUG - payload.document.status before stringify:', (payload.document as Record<string, unknown>).status)
    const payloadStr = JSON.stringify(payload)
    console.log('STATUS DEBUG - In JSON string:', payloadStr.includes('"status":"pending"'))
    console.log('PDFMonkey payload:', payloadStr)

    const response = await fetch('https://api.pdfmonkey.io/api/v1/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Token provisto por el usuario (temporalmente hardcoded para pruebas)
        Authorization: 'Bearer 7mCRJHas8oqUQxsQX-in'
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json() as Record<string, unknown>
    
    if (!response.ok) {
      console.error('PDFMonkey API error:', {
        status: response.status,
        statusText: response.statusText,
        data
      })
      return NextResponse.json({ error: 'PDFMonkey error', details: data }, { status: 502 })
    }

    console.log('PDFMonkey document created successfully:', {
      documentId: (data as {id?: string}).id,
      status: (data as {status?: string}).status,
      reportId: report_id
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating PDFMonkey document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


