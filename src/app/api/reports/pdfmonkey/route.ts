import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Types for PDF template configuration
type AnalysisType = 'virology' | 'phytopatology' | 'bacteriology' | 'nematology' | 'early_detection' | 'default'

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
  payloadBuilder: (report: ReportData, client: ClientData | null, resultados: ResultadoData[], analystName?: string) => Record<string, unknown>
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
    suspected_pathogen: string | null
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
    payloadBuilder: (report, client, resultados, analystName) => {
      const currentDate = new Date()

      const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
      }

      // Combine findings from all resultados
      const allTests: unknown[] = []
      const allIdentificationTechniques: string[] = []
      const allVirusNames: string[] = []
      const allMethodNames: string[] = []

      resultados.forEach((resultado, resultIdx) => {
        let findings = resultado?.findings as unknown
        if (typeof findings === 'string') {
          try { findings = JSON.parse(findings) } catch { findings = undefined }
        }
        
        const tests = Array.isArray((findings as Record<string, unknown>)?.tests) ? (findings as Record<string, unknown>).tests as unknown[] : []
        
        // Add tests with sample identification
        tests.forEach((test: unknown) => {
          const testObj = test as Record<string, unknown>
          allTests.push({
            ...testObj,
            sample_code: resultado?.samples?.code || `SAMPLE-${resultIdx + 1}`,
            sample_id: resultado?.sample_id
          })
        })

        // Collect identification techniques
        const identificationTechniques: string[] = Array.isArray((findings as Record<string, unknown>)?.identification_techniques)
          ? (findings as Record<string, unknown>).identification_techniques as string[]
          : []
        allIdentificationTechniques.push(...identificationTechniques)

        // Collect virus names and method names
        tests.forEach((t: unknown) => {
          const test = t as Record<string, unknown>
          if (test.virus) allVirusNames.push(test.virus as string)
          if (test.method) allMethodNames.push(test.method as string)
        })
      })

      const methodNames = Array.from(new Set(allMethodNames))
      const tecnicaUtilizadaDesc = allIdentificationTechniques.length > 0
        ? Array.from(new Set(allIdentificationTechniques)).join(' y ')
        : (methodNames.length > 0 ? methodNames.join(' y ') : 'No especificado')

      const virusNames = Array.from(new Set(allVirusNames))
      const tipoAnalisisDesc = virusNames.length === 1
        ? `Determinación del virus ${virusNames[0]}`
        : 'Determinación de virus fitopatógenos'

      const resultadosPayload = allTests.map((t: unknown, idx: number) => {
        const test = t as Record<string, unknown>
        return {
          muestra: test.sample_code as string || String(idx + 1),
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
          numeroMuestras: String(resultados.length),
          fechaRecepcion: resultados[0]?.performed_at ? formatDate(resultados[0].performed_at) : formatDate(currentDate.toISOString()),
          fechaEntrega: resultados[0]?.validation_date ? formatDate(resultados[0].validation_date) : formatDate(currentDate.toISOString())
        },
        tipoAnalisis: { descripcion: tipoAnalisisDesc },
        tecnicaUtilizada: { descripcion: tecnicaUtilizadaDesc },
        procedimientoMuestreo: {
          procedimientoUtilizado: '----------',
          personaTomoMuestra: resultados[0]?.performed_by ? 'Muestras tomadas por laboratorio' : 'Muestras tomadas por cliente'
        },
        informacionGeneral: {
          especie: (resultados[0] as ResultadoData)?.samples?.species || 'No especificado',
          cuartel: '',
          variedadPortainjerto: (resultados[0] as ResultadoData)?.samples?.variety || '',
          anoPlantacion: (resultados[0] as ResultadoData)?.samples?.planting_year ? String((resultados[0] as ResultadoData).samples!.planting_year) : '',
          organoAnalizado: ''
        },
        resultados: resultadosPayload,
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
  
  early_detection: {
    templateId: '6AD1FA7C-65EE-4E23-9413-DBE68F53C9C9',
    payloadBuilder: (report, client, resultados, analystName) => {
      const currentDate = new Date()

      const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
      }

      // Combine findings from all resultados
      const allTests: unknown[] = []
      const allVarieties: string[] = []

      resultados.forEach((resultado, resultIdx) => {
        let findings = resultados[0]?.findings as unknown
        if (typeof findings === 'string') {
          try { findings = JSON.parse(findings) } catch { findings = undefined }
        }
        
        const tests = Array.isArray((findings as Record<string, unknown>)?.tests) ? (findings as Record<string, unknown>).tests as unknown[] : []
        
        // Add tests with sample identification
        tests.forEach((test: unknown) => {
          const testObj = test as Record<string, unknown>
          allTests.push({
            ...testObj,
            sample_code: resultado?.samples?.code || `SAMPLE-${resultIdx + 1}`,
            sample_id: resultado?.sample_id
          })
        })

        // Collect varieties
        tests.forEach((t: unknown) => {
          const test = t as Record<string, unknown>
          if (test.variety) allVarieties.push(test.variety as string)
        })
      })

      // Get sample data for tipoMuestra description
      const sampleSpecies = resultados[0]?.samples?.species || 'No especificado'
      const varieties = Array.from(new Set(allVarieties))
      const varietiesText = varieties.length > 0 ? varieties.join(', ') : 'No especificado'
      
      const tipoMuestraDesc = `${allTests.length} muestras de ${sampleSpecies} de las variedades ${varietiesText}.`

      // Get suspected pathogen for tipoAnalisis
      const suspectedPathogen = resultados[0]?.samples?.suspected_pathogen || 'patógeno no especificado'
      const tipoAnalisisDesc = `Detección precoz del ${suspectedPathogen}.`

      // Map results array
      const resultadosPayload = allTests.map((t: unknown, idx: number) => {
        const test = t as Record<string, unknown>
        return {
          numeroMuestra: test.sample_code as string || String(idx + 1),
          numeroCuartel: test.identification || `Cuartel ${idx + 1}`,
          variedad: test.variety || 'No especificado',
          racimosEvaluados: parseInt(test.units_evaluated as string) || 0,
          escalaSeveridad: {
            nota0: parseInt((test.severity_scale as Record<string, string>)['0']) || 0,
            nota1: parseInt((test.severity_scale as Record<string, string>)['1']) || 0,
            nota2: parseInt((test.severity_scale as Record<string, string>)['2']) || 0,
            nota3: parseInt((test.severity_scale as Record<string, string>)['3']) || 0
          }
        }
      })

      const reportNumber = `${currentDate.getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`

      return {
        numeroInforme: reportNumber,
        tituloInforme: 'INFORME FITOPATOLÓGICO',
        informacionSolicitante: {
          productor: client?.name || 'Cliente no especificado',
          localidad: client?.address || 'No especificada',
          contacto: client?.contact_email || client?.phone || 'No especificado',
          fechaRecepcion: resultados[0]?.performed_at ? formatDate(resultados[0].performed_at) : formatDate(currentDate.toISOString()),
          fechaMuestreo: resultados[0]?.performed_at ? formatDate(resultados[0].performed_at) : formatDate(currentDate.toISOString()),
          fechaInforme: resultados[0]?.validation_date ? formatDate(resultados[0].validation_date) : formatDate(currentDate.toISOString())
        },
        tipoMuestra: {
          descripcion: tipoMuestraDesc
        },
        tipoAnalisis: {
          descripcion: tipoAnalisisDesc
        },
        metodologia: {
          descripcion: 'Las muestras, constituidas por un número diferente de racimos de uva de las variedades correspondientes, fueron sometidas a un proceso de cámara húmeda. Se colocaron en bandejas plásticas saturadas de humedad a temperatura constante de 24°C. Se aplicó un régimen de luz alternante de 12 horas luz y 12 horas oscuridad durante 10 días. El propósito fue inducir la esporulación rápida del patógeno.'
        },
        escalaSeveridad: {
          descripcion: 'Transcurrido el periodo de incubación en cámara húmeda, los resultados se evaluaron utilizando una escala de notas de severidad de ataque de 0 a 3, donde:',
          nota0: 'Sin patógeno, racimos sanos',
          nota1: 'Hasta 25% de patógeno en los racimos',
          nota2: '25% a 50% de patógeno en los racimos',
          nota3: 'Sobre 50% de patógeno en los racimos'
        },
        resultados: resultadosPayload,
        diagnostico: {
          descripcion: 'Los resultados de los análisis de detección precoz efectuados en las muestras demostraron diferentes niveles de severidad. Se evaluó la presencia del patógeno utilizando la escala de severidad establecida, permitiendo determinar el potencial de inoculo en las muestras analizadas.'
        },
        analista: {
          nombre: analystName || 'Analista',
          titulo: 'Ingeniero Agrónomo, M.Sc.',
          departamento: 'Laboratorio Fitopatología',
          email: 'analista@laboratorio.cl'
        }
      }
    }
  },

  bacteriology: {
    templateId: 'BFFA2B14-DA47-4D06-B593-0CC084D374C6',
    payloadBuilder: (report, client, resultados, analystName) => {
      const currentDate = new Date()

      // Helpers
      const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
      }

      // Combine findings from all resultados
      const allTests: unknown[] = []
      const allIdentificationTechniques: string[] = []
      const allBacteriaNames: string[] = []
      const allMethodNames: string[] = []

      resultados.forEach((resultado, resultIdx) => {
        let findings = resultados[0]?.findings as unknown
        if (typeof findings === 'string') {
          try {
            findings = JSON.parse(findings)
          } catch {
            findings = undefined
          }
        }
        
        const tests = Array.isArray((findings as Record<string, unknown>)?.tests) ? (findings as Record<string, unknown>).tests as unknown[] : []
        
        // Add tests with sample identification
        tests.forEach((test: unknown) => {
          const testObj = test as Record<string, unknown>
          allTests.push({
            ...testObj,
            sample_code: resultado?.samples?.code || `SAMPLE-${resultIdx + 1}`,
            sample_id: resultado?.sample_id
          })
        })

        // Collect identification techniques
        const identificationTechniques: string[] = Array.isArray((findings as Record<string, unknown>)?.identification_techniques)
          ? (findings as Record<string, unknown>).identification_techniques as string[]
          : []
        allIdentificationTechniques.push(...identificationTechniques)

        // Collect bacteria names and method names
        tests.forEach((t: unknown) => {
          const test = t as Record<string, unknown>
          if (test.microorganism) allBacteriaNames.push(test.microorganism as string)
          if (test.method) allMethodNames.push(test.method as string)
        })
      })

      // numeroInforme: YYYY-<random 3 digits>
      const reportNumber = `${currentDate.getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`

      // tecnica utilizada: prefer identification_techniques, else distinct methods
      const methodNames = Array.from(new Set(allMethodNames))
      const tecnicaUtilizadaDesc = allIdentificationTechniques.length > 0
        ? Array.from(new Set(allIdentificationTechniques)).join(' y ')
        : (methodNames.length > 0 ? methodNames.join(' y ') : 'No especificado')

      // tipoAnalisis descripcion: usar bacteria única si posible
      const bacteriaNames = Array.from(new Set(allBacteriaNames))
      const tipoAnalisisDesc = bacteriaNames.length === 1
        ? `Determinación de ${bacteriaNames[0]}`
        : 'Determinación de bacterias fitopatógenas'

      // resultados array
      const resultadosPayload = allTests.map((t: unknown, idx: number) => {
        const test = t as Record<string, unknown>
        return {
          muestra: test.sample_code as string || String(idx + 1),
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
          numeroMuestras: String(resultados.length),
          fechaRecepcion: resultados[0]?.performed_at ? formatDate(resultados[0].performed_at) : formatDate(currentDate.toISOString()),
          fechaEntrega: resultados[0]?.validation_date ? formatDate(resultados[0].validation_date) : formatDate(currentDate.toISOString())
        },
        tipoAnalisis: {
          descripcion: tipoAnalisisDesc
        },
        tecnicaUtilizada: {
          descripcion: tecnicaUtilizadaDesc
        },
        procedimientoMuestreo: {
          procedimientoUtilizado: '----------',
          personaTomoMuestra: resultados[0]?.performed_by ? 'Muestras tomadas por laboratorio' : 'Muestras tomadas por cliente'
        },
        informacionGeneral: {
          especie: resultados[0]?.samples?.species || 'No especificado',
          cuartel: '',
          variedadPortainjerto: resultados[0]?.samples?.variety || '',
          anoPlantacion: resultados[0]?.samples?.planting_year ? String(resultados[0].samples.planting_year) : '',
          organoAnalizado: ''
        },
        resultados: resultadosPayload,
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
    payloadBuilder: (report, client, resultados, analystName) => {
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
      let resultadosData: Array<{numeroMuestra: string, identificacionMuestra: string, microorganismos: Array<{nombre: string, dilucion10_1: number, dilucion10_2: number, dilucion10_3: number}>}> = []
      
      // Handle findings - might be JSON string or object
      let findings: unknown = resultados[0]?.findings
      if (typeof findings === 'string') {
        try {
          findings = JSON.parse(findings)
        } catch {
          findings = undefined
        }
      }
      
      if (findings && typeof findings === 'object' && (findings as Record<string, unknown>).tests && Array.isArray((findings as Record<string, unknown>).tests)) {
        // Group microorganisms by sample (each test represents one sample)
        ((findings as Record<string, unknown>).tests as Array<{microorganism?: string, dilutions?: Record<string, string>, identification?: string}>).forEach((test, index: number) => {
          const microorganismos: Array<{nombre: string, dilucion10_1: number, dilucion10_2: number, dilucion10_3: number}> = []
          
          if (test.microorganism && test.dilutions) {
            microorganismos.push({
              nombre: test.microorganism,
              dilucion10_1: parseInt(test.dilutions['10-1']) || 0,
              dilucion10_2: parseInt(test.dilutions['10-2']) || 0,  
              dilucion10_3: parseInt(test.dilutions['10-3']) || 0
            })
          }
          
          resultadosData.push({
            numeroMuestra: (index + 1).toString(),
            identificacionMuestra: test.identification || `Muestra ${index + 1}`,
            microorganismos: microorganismos
          })
        })
      }
      
      // If no results found, add default entry
      if (resultadosData.length === 0) {
        resultadosData = [{
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
          fechaRecepcion: resultados[0]?.performed_at ? formatDate(resultados[0].performed_at) : formatDate(currentDate.toISOString()),
          fechaInforme: resultados[0]?.validation_date ? formatDate(resultados[0].validation_date) : formatDate(currentDate.toISOString()),
          numeroMuestras: resultados.length.toString()
        },
        tipoMuestra: {
          descripcion: resultados[0]?.conclusion || 'Muestra de suelo para análisis fitopatológico. Recuento de colonias.'
        },
        metodologia: {
          descripcion: resultados[0]?.methodology || defaults.metodologiaDescripcion
        },
        resultados: resultadosData,
        diagnostico: {
          descripcion: resultados[0]?.diagnosis || resultados[0]?.conclusion || 'Análisis fitopatológico completado. Los microorganismos identificados corresponden a la flora natural del suelo.'
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
      let findings: unknown = resultado[0]?.findings
      if (typeof findings === 'string') {
        try {
          findings = JSON.parse(findings)
        } catch {
          findings = undefined
        }
      }
      
      if (findings && typeof findings === 'object' && (findings as Record<string, unknown>).nematodes && Array.isArray((findings as Record<string, unknown>).nematodes)) {
        nematodes = ((findings as Record<string, unknown>).nematodes as Array<{name?: string, quantity?: string, generoEspecie?: string, cantidad?: string}>).map((nem) => ({
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
          fechaRecepcion: resultado[0]?.performed_at ? formatDate(resultado[0].performed_at) : formatDate(currentDate.toISOString()),
          fechaEntrega: resultado[0]?.validation_date ? formatDate(resultado[0].validation_date) : formatDate(currentDate.toISOString())
        },
        tipoAnalisis: {
          descripcion: defaults.tipoAnalisisDescripcion
        },
        metodologia: {
          descripcion: resultado[0]?.methodology || defaults.metodologiaDescripcion
        },
        procedimientoMuestreo: {
          procedimientoUtilizado: "----------",
          personaTomoMuestra: "Cliente"
        },
        resultados: [
          {
            numeroMuestra: "1",
            identificacionCliente: resultado[0]?.sample_id || 'Muestra',
            codigoInterno: resultado[0]?.id || report.id,
            nematodos: nematodes
          }
        ],
        conclusiones: {
          descripcion: resultado[0]?.conclusion || 
                      resultado[0]?.diagnosis || 
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
function resolveTemplateAndPayload(report: ReportData, client: ClientData | null, resultados: ResultadoData[], analystName?: string): { templateId: string; payload: Record<string, unknown> } {
  // Determine analysis type from report data or resultado data
  let analysisType: AnalysisType = 'default'
  
  console.log('PDFMonkey: Resolving template and payload...')
  console.log('PDFMonkey: resultados count:', resultados.length)
  console.log('PDFMonkey: report.test_areas:', report.test_areas)
  console.log('PDFMonkey: report.analysis_type:', report.analysis_type)
  
  // Option 1: Check first resultado test_area first (most specific)
  const firstResultado = resultados[0]
  if (firstResultado?.test_area) {
    const testArea = firstResultado.test_area.toLowerCase()
    console.log('PDFMonkey: Checking first resultado test_area:', testArea)
    if (testArea.includes('nematolog')) {
      analysisType = 'nematology'
    } else if (testArea.includes('virus') || testArea.includes('viral') || testArea.includes('virolog')) {
      analysisType = 'virology'
    } else if (testArea.includes('fitopatolog') || testArea.includes('pathog') || testArea.includes('fung')) {
      analysisType = 'phytopatology'
    } else if (testArea.includes('bacter') || testArea.includes('bacteriolog')) {
      analysisType = 'bacteriology'
    } else if (testArea.includes('deteccion') || testArea.includes('precoz')) {
      analysisType = 'early_detection'
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
    } else if (testAreasLower.some(area => area.includes('deteccion') || area.includes('precoz'))) {
      analysisType = 'early_detection'
    }
  }
  
  console.log('PDFMonkey: Final analysis type:', analysisType)
  const templateConfig = PDF_TEMPLATES[analysisType]
  console.log('PDFMonkey: Using template ID:', templateConfig.templateId)
  
  return {
    templateId: templateConfig.templateId,
    payload: templateConfig.payloadBuilder(report, client, resultados, analystName)
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
    const { result_id, result_ids, report_id } = body || {}

    // Accept either result_id, result_ids (new), or report_id for backward compatibility
    const targetIds = result_ids || (result_id ? [result_id] : [])
    const targetId = result_id || report_id

    if (!targetIds.length && !targetId) {
      return NextResponse.json({ error: 'result_id, result_ids, or report_id is required' }, { status: 400 })
    }

    console.log('PDFMonkey: Processing request with targetIds:', targetIds, 'targetId:', targetId, 'type:', result_ids ? 'result_ids' : (result_id ? 'result_id' : 'report_id'))

    // Initialize variables
    let report: ReportData | null = null
    let client: ClientData | null = null
    let resultados: ResultadoData[] = []

    if (targetIds.length > 0) {
      // If we have result_ids, fetch all results
      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select('id, sample_id, test_area, result_type, findings, methodology, performed_by, performed_at, validated_by, validation_date, conclusion, diagnosis, recommendations, report_id, samples:sample_id (id, code, species, variety, rootstock, planting_year, received_date, suspected_pathogen)')
        .in('id', targetIds)
      
      if (resultsError || !resultsData || resultsData.length === 0) {
        console.warn('PDFMonkey: results not found or inaccessible', { targetIds, resultsError })
        return NextResponse.json({ error: 'Results not found' }, { status: 404 })
      }
      
      resultados = (resultsData as unknown) as ResultadoData[]
      
      // Validate that all results belong to the same client
      if (resultados.length > 1) {
        // Get client_id for each result by querying samples
        const sampleIds = resultados.map(r => r.sample_id).filter(Boolean)
        console.log('PDFMonkey: Validating client consistency for sampleIds:', sampleIds)
        
        if (sampleIds.length > 0) {
          const { data: samplesData, error: samplesError } = await supabase
            .from('samples')
            .select('id, client_id')
            .in('id', sampleIds)
          
          console.log('PDFMonkey: Samples data:', samplesData, 'Error:', samplesError)
          
          if (samplesData && samplesData.length > 0) {
            const clientIds = samplesData.map(s => s.client_id)
            const uniqueClientIds = [...new Set(clientIds)]
            
            console.log('PDFMonkey: Client IDs found:', clientIds, 'Unique:', uniqueClientIds)
            
            if (uniqueClientIds.length > 1) {
              console.error('PDFMonkey: Results from different clients detected')
              return NextResponse.json({ 
                error: 'All results must belong to the same client' 
              }, { status: 400 })
            }
          } else {
            console.log('PDFMonkey: No samples data found, skipping client validation')
          }
        }
      }
      
      // Get report info from the first result
      const firstResult = resultsData[0]
      if (firstResult.report_id) {
        const { data: reportData } = await supabase
          .from('reports')
          .select('id, created_at, client_id, test_areas')
          .eq('id', firstResult.report_id)
          .single()
        report = reportData
      } else {
        // If no report_id, create a minimal report structure
        report = {
          id: 'temp-report',
          created_at: new Date().toISOString(),
          client_id: null,
          test_areas: [firstResult.test_area]
        }
      }
    } else if (result_id) {
      // If we have result_id, fetch the result directly and get report/client info from it
      const { data: resultData, error: resultError } = await supabase
        .from('results')
        .select('id, sample_id, test_area, result_type, findings, methodology, performed_by, performed_at, validated_by, validation_date, conclusion, diagnosis, recommendations, report_id, samples:sample_id (id, code, species, variety, rootstock, planting_year, received_date, suspected_pathogen)')
        .eq('id', result_id)
        .single()
      
      if (resultError || !resultData) {
        console.warn('PDFMonkey: result not found or inaccessible', { result_id, resultError })
        return NextResponse.json({ error: 'Result not found' }, { status: 404 })
      }
      
      resultados = [(resultData as unknown) as ResultadoData]
      
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
        .select('id, sample_id, test_area, result_type, findings, methodology, performed_by, performed_at, validated_by, validation_date, conclusion, diagnosis, recommendations, report_id, samples:sample_id (id, code, species, variety, rootstock, planting_year, received_date, suspected_pathogen)')
        .eq('report_id', report_id)
        .single()
      
      if (resultError) {
        console.warn('PDFMonkey: result not found, using default payload', { report_id, resultError })
      } else {
        resultados = [(resultData as unknown) as ResultadoData]
      }
    }

    // Fetch client separately to avoid inner-join filtering
    // Priority: client from results > client from report
    let clientId = null
    
    // First, try to get client from the first result's sample
    if (resultados[0]?.sample_id) {
      const { data: sampleData } = await supabase
        .from('samples')
        .select('client_id')
        .eq('id', resultados[0].sample_id)
        .single()
      
      if (sampleData?.client_id) {
        clientId = sampleData.client_id
      }
    }
    
    // If no client from results, try to get it from the report
    if (!clientId && report?.client_id) {
      clientId = report.client_id
    }
    
    // Fetch client data
    if (clientId) {
      console.log('PDFMonkey: Fetching client with ID:', clientId)
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, name, address, contact_email, phone, rut')
        .eq('id', clientId)
          .single()
        client = clientData
      console.log('PDFMonkey: Client data:', client)
    } else {
      console.log('PDFMonkey: No client ID found, will use default client info')
    }

    console.log('PDFMonkey: Found result data:', JSON.stringify(resultados, null, 2))
    if (resultados[0]?.findings) {
      console.log('PDFMonkey: Result findings raw:', resultados[0].findings)
      console.log('PDFMonkey: Result findings type:', typeof resultados[0].findings)
      
      // Handle case where findings might be a JSON string
      if (typeof resultados[0].findings === 'string') {
        try {
          resultados[0].findings = JSON.parse(resultados[0].findings)
          console.log('PDFMonkey: Parsed findings from string:', JSON.stringify(resultados[0].findings, null, 2))
        } catch (e) {
          console.error('PDFMonkey: Failed to parse findings JSON string:', e)
        }
      } else {
        console.log('PDFMonkey: Result findings structure:', JSON.stringify(resultados[0].findings, null, 2))
      }
    } else {
      console.log('PDFMonkey: No findings data found')
    }

    // Generate filename: client_name + test_areas + date
    const clientName = client?.name ? client.name.replace(/[^a-zA-Z0-9]/g, '_') : 'Cliente'
    const testAreas = Array.isArray(report?.test_areas) && report?.test_areas.length > 0
      ? report?.test_areas.join('_').replace(/[^a-zA-Z0-9]/g, '_')
      : 'Analisis'
    const dateStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD format
    const filename = `${clientName}_${testAreas}_${dateStr}.pdf`

    // Fetch analyst name if we have resultado data
    let analystName = 'DRA. LUCIA RIVERA C.' // Default
    if (resultados[0]?.validated_by) {
      const { data: userData } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', resultados[0].validated_by)
        .single()
      if (userData?.name) {
        analystName = userData.name
      }
    }

    // Dynamically resolve template and payload based on analysis type
    const { templateId, payload: templatePayload } = resolveTemplateAndPayload(report!, client, resultados, analystName)

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


