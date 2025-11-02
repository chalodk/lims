'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import { useAuth } from '@/hooks/useAuth'
import { SampleWithClient, SampleTest, TestCatalog, Method } from '@/types/database'
import { 
  FlaskConical,
  X,
  Loader2,
  TestTube,
  Plus,
  Minus
} from 'lucide-react'

interface AddResultModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  preselectedSampleId?: string
  resultId?: string | null // Para modo edición
}

const METHOD_OPTIONS = [
  'Tamizado de Cobb y Embudo de Baermann',
  'Centrífuga',
  'Incubación y Tamizado de Cobb',
  'Placa petri',
  'Incubación',
  'Cámara húmeda',
  'Recuento de colonias'
]

const IDENTIFICATION_TECHNIQUE_OPTIONS = [
  'Taxonomía tradicional',
  'RT-PCR',
  'PCR',
  'ELISA'
]

// Helper function to map analysis IDs to names for different analysis types
const mapAnalysisIdsToNames = (
  tests: Array<{method?: string, virus?: string, microorganism?: string, [key: string]: unknown}>, 
  analysisType: 'virology' | 'phytopathology', 
  availableMethods: Array<{id: string, name: string}>,
  availableAnalytes: Array<{id: string, scientific_name: string}>,
  availableMicroorganisms: Array<{id: string, scientific_name: string}>
) => {
  return tests.map(test => {
    const mappedTest = { ...test }
    
    // Map method ID to name (common for all types)
    if (test.method && availableMethods) {
      const methodName = availableMethods.find(m => m.id == test.method)?.name
      if (methodName) mappedTest.method = methodName
    }
    
    // Map specific fields based on analysis type
    if (analysisType == 'virology' && test.virus && availableAnalytes) {
      const virusName = availableAnalytes.find(a => a.id == test.virus)?.scientific_name
      if (virusName) mappedTest.virus = virusName
    } else if (analysisType == 'phytopathology' && test.microorganism && availableMicroorganisms) {
      const microorganismName = availableMicroorganisms.find(m => m.id == test.microorganism)?.scientific_name
      if (microorganismName) mappedTest.microorganism = microorganismName
    }
    
    return mappedTest
  })
}

export default function AddResultModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  preselectedSampleId,
  resultId 
}: AddResultModalProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingResult, setIsLoadingResult] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [samples, setSamples] = useState<SampleWithClient[]>([])
  const [sampleTests, setSampleTests] = useState<(SampleTest & { test_catalog?: TestCatalog, methods?: Method })[]>([])
  const [loadingSamples, setLoadingSamples] = useState(false)
  const [loadingTests, setLoadingTests] = useState(false)
  
  const [formData, setFormData] = useState({
    sample_id: preselectedSampleId || '',
    sample_test_id: '',
    methodology: '',
    methodologies: [] as string[],
    identification_techniques: [] as string[],
    findings: '',
    conclusion: '',
    diagnosis: '',
    pathogen_identified: '',
    pathogen_type: '',
    severity: '',
    confidence: '',
    result_type: '',
    recommendations: ''
  })

  const [selectedAnalysisArea, setSelectedAnalysisArea] = useState<string>('')

  // Nematology-specific state
  const [nematologyData, setNematologyData] = useState({
    negativeQuantity: '',
    positiveNematodes: [{ name: '', quantity: '' }]
  })

  // Virology-specific state
  const [virologyData, setVirologyData] = useState({
    tests: [{ identification: '', method: '', virus: '', result: '' }]
  })

  // Bacteriology-specific state (similar to virology but using microorganism)
  const [bacteriologyData, setBacteriologyData] = useState({
    tests: [{ identification: '', method: '', microorganism: '', result: '' }]
  })

  // Early detection-specific state
  const [earlyDetectionData, setEarlyDetectionData] = useState({
    tests: [{ 
      sample_code: '', 
      identification: '', 
      variety: '', 
      units_evaluated: '', 
      severity_scale: { '0': '', '1': '', '2': '', '3': '' }
    }]
  })

  // Phytopathology-specific state
  const [phytopathologyData, setPhytopathologyData] = useState({
    tests: [{ 
      identification: '', 
      microorganism: '', 
      dilutions: {
        '10-1': '',
        '10-2': '',
        '10-3': ''
      }
    }]
  })

  const [availableMethods, setAvailableMethods] = useState<Array<{id: string, name: string}>>([])
  const [availableAnalytes, setAvailableAnalytes] = useState<Array<{id: string, scientific_name: string}>>([])
  const [availableMicroorganisms, setAvailableMicroorganisms] = useState<Array<{id: string, scientific_name: string}>>([])
  const [availableNematodes, setAvailableNematodes] = useState<Array<{id: string, scientific_name: string}>>([])
  const [availableBacteria, setAvailableBacteria] = useState<Array<{id: string, scientific_name: string}>>([])
  const [loadingMethodsAndAnalytes, setLoadingMethodsAndAnalytes] = useState(false)

  const supabase = getSupabaseClient()

  const fetchSamples = useCallback(async () => {
    if (!user?.company_id) return

    try {
      setLoadingSamples(true)
      const { data, error } = await supabase
        .from('samples')
        .select(`
          *,
          clients (id, name, rut, contact_email),
          sample_tests (
            id,
            test_catalog (id, name, area),
            methods (id, name)
          )
        `)
        .eq('company_id', user.company_id)
        .in('status', ['received', 'processing', 'microscopy', 'isolation', 'identification', 'molecular_analysis'])
        .order('received_date', { ascending: false })

      if (error) throw error
      setSamples(data || [])
    } catch (error) {
      console.error('Error fetching samples:', error)
      setSamples([])
    } finally {
      setLoadingSamples(false)
    }
  }, [supabase, user?.company_id])

  const fetchSampleTests = useCallback(async (sampleId: string) => {
    if (!sampleId) {
      setSampleTests([])
      return
    }

    try {
      setLoadingTests(true)
      const { data, error } = await supabase
        .from('sample_tests')
        .select(`
          *,
          test_catalog (id, name, area),
          methods (id, name)
        `)
        .eq('sample_id', sampleId)

      if (error) throw error
      setSampleTests(data || [])
    } catch (error) {
      console.error('Error fetching sample tests:', error)
      setSampleTests([])
    } finally {
      setLoadingTests(false)
    }
  }, [supabase])

  // Load result data when in edit mode
  const loadResultData = useCallback(async () => {
    if (!resultId) return

    try {
      setIsLoadingResult(true)
      setValidationError(null)
      
      const response = await fetch(`/api/results/${resultId}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch result')
      }
      
      const result = await response.json()
      console.log('Loaded result data:', result)
      
      // Ensure samples are loaded before setting sample_id
      await fetchSamples()
      
      // Set basic form data
      setFormData(prev => ({
        ...prev,
        sample_id: result.sample_id || '',
        sample_test_id: result.sample_test_id || '',
        methodology: result.methodology || '',
        methodologies: result.methodology ? [result.methodology] : [],
        identification_techniques: [],
        findings: result.findings ? (typeof result.findings === 'string' ? result.findings : JSON.stringify(result.findings, null, 2)) : '',
        conclusion: result.conclusion || '',
        diagnosis: result.diagnosis || '',
        pathogen_identified: result.pathogen_identified || '',
        pathogen_type: result.pathogen_type || '',
        severity: result.severity || '',
        confidence: result.confidence || '',
        result_type: result.result_type || '',
        recommendations: result.recommendations || ''
      }))
      
      // Set selected analysis area from test_area
      if (result.test_area) {
        setSelectedAnalysisArea(result.test_area)
      }
      
      // Parse findings JSON and populate specific data structures
      if (result.findings && typeof result.findings === 'object') {
        const findings = result.findings
        
        if (findings.type === 'nematologia_negative') {
          setNematologyData({
            negativeQuantity: findings.nematodes?.[0]?.quantity || '',
            positiveNematodes: [{ name: '', quantity: '' }]
          })
          setFormData(prev => ({
            ...prev,
            result_type: 'negative',
            pathogen_identified: findings.nematodes?.[0]?.name || ''
          }))
        } else if (findings.type === 'nematologia_positive') {
          setNematologyData({
            negativeQuantity: '',
            positiveNematodes: findings.nematodes?.length > 0 
              ? findings.nematodes.map((n: { name: string, quantity: string }) => ({ name: n.name || '', quantity: n.quantity || '' }))
              : [{ name: '', quantity: '' }]
          })
          setFormData(prev => ({
            ...prev,
            result_type: 'positive'
          }))
        } else if (findings.type === 'virologia' && findings.tests) {
          setVirologyData({
            tests: findings.tests.length > 0
              ? findings.tests.map((t: { identification?: string, method?: string, virus?: string, result?: string }) => ({
                  identification: t.identification || '',
                  method: t.method || '',
                  virus: t.virus || '',
                  result: t.result || ''
                }))
              : [{ identification: '', method: '', virus: '', result: '' }]
          })
        } else if (findings.type === 'fitopatologia' && findings.tests) {
          setPhytopathologyData({
            tests: findings.tests.length > 0
              ? findings.tests.map((t: { identification?: string, microorganism?: string, dilutions?: Record<string, string> }) => ({
                  identification: t.identification || '',
                  microorganism: t.microorganism || '',
                  dilutions: t.dilutions || { '10-1': '', '10-2': '', '10-3': '' }
                }))
              : [{ 
                  identification: '', 
                  microorganism: '', 
                  dilutions: { '10-1': '', '10-2': '', '10-3': '' }
                }]
          })
        } else if (findings.type === 'bacteriologia' && findings.tests) {
          setBacteriologyData({
            tests: findings.tests.length > 0
              ? findings.tests.map((t: { identification?: string, method?: string, microorganism?: string, result?: string }) => ({
                  identification: t.identification || '',
                  method: t.method || '',
                  microorganism: t.microorganism || '',
                  result: t.result || ''
                }))
              : [{ identification: '', method: '', microorganism: '', result: '' }]
          })
        } else if (findings.type === 'deteccion_precoz' && findings.tests) {
          setEarlyDetectionData({
            tests: findings.tests.length > 0
              ? findings.tests.map((t: { 
                  sample_code?: string,
                  identification?: string, 
                  variety?: string, 
                  units_evaluated?: string,
                  severity_scale?: Record<string, string>
                }) => ({
                  sample_code: t.sample_code || '',
                  identification: t.identification || '',
                  variety: t.variety || '',
                  units_evaluated: t.units_evaluated || '',
                  severity_scale: t.severity_scale || { '0': '', '1': '', '2': '', '3': '' }
                }))
              : [{ 
                  sample_code: '', 
                  identification: '', 
                  variety: '', 
                  units_evaluated: '', 
                  severity_scale: { '0': '', '1': '', '2': '', '3': '' }
                }]
          })
        }
      }
      
      // Load sample tests for the selected sample
      if (result.sample_id) {
        await fetchSampleTests(result.sample_id)
      }
    } catch (error) {
      console.error('Error loading result data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setValidationError(`Error al cargar los datos del resultado: ${errorMessage}`)
    } finally {
      setIsLoadingResult(false)
    }
  }, [resultId, fetchSamples, fetchSampleTests])

  useEffect(() => {
    if (isOpen) {
      fetchSamples()
      if (preselectedSampleId) {
        fetchSampleTests(preselectedSampleId)
      }
      
      if (resultId) {
        // Load result data for editing
        loadResultData()
      } else {
        // Reset form for new result
        setFormData({
          sample_id: preselectedSampleId || '',
          sample_test_id: '',
          methodology: '',
          methodologies: [],
          identification_techniques: [],
          findings: '',
          conclusion: '',
          diagnosis: '',
          pathogen_identified: '',
          pathogen_type: '',
          severity: '',
          confidence: '',
          result_type: '',
          recommendations: ''
        })
        setSelectedAnalysisArea('')
        setNematologyData({
          negativeQuantity: '',
          positiveNematodes: [{ name: '', quantity: '' }]
        })
        setVirologyData({
          tests: [{ identification: '', method: '', virus: '', result: '' }]
        })
        setBacteriologyData({
          tests: [{ identification: '', method: '', microorganism: '', result: '' }]
        })
        setEarlyDetectionData({
          tests: [{ 
            sample_code: '', 
            identification: '', 
            variety: '', 
            units_evaluated: '', 
            severity_scale: { '0': '', '1': '', '2': '', '3': '' }
          }]
        })
        setPhytopathologyData({
          tests: [{ 
            identification: '', 
            microorganism: '', 
            dilutions: {
              '10-1': '',
              '10-2': '',
              '10-3': ''
            }
          }]
        })
        setValidationError(null)
      }
    } else {
      // Reset when modal closes
      setValidationError(null)
      setIsLoadingResult(false)
    }
  }, [isOpen, fetchSamples, fetchSampleTests, preselectedSampleId, resultId, loadResultData])

  useEffect(() => {
    if (formData.sample_id) {
      fetchSampleTests(formData.sample_id)
    } else {
      setSampleTests([])
    }
  }, [formData.sample_id, fetchSampleTests])

  useEffect(() => {
    if (formData.sample_test_id) {
      const selectedTest = sampleTests.find(test => test.id === formData.sample_test_id)
      if (selectedTest?.test_catalog?.area) {
        setSelectedAnalysisArea(selectedTest.test_catalog.area)
      }
    } else {
      setSelectedAnalysisArea('')
    }
  }, [formData.sample_test_id, sampleTests])

  const fetchMethodsAndAnalytes = useCallback(async () => {
    if (!user?.company_id) return

    try {
      setLoadingMethodsAndAnalytes(true)
      
      // Fetch methods (all for now, can be filtered by virus type later)
      const { data: methodsData, error: methodsError } = await supabase
        .from('methods')
        .select('id, name')
        .order('name')

      if (methodsError) throw methodsError
      setAvailableMethods(methodsData || [])

      // Fetch analytes with type = virus
      const { data: analytesData, error: analytesError } = await supabase
        .from('analytes')
        .select('id, scientific_name')
        .eq('type', 'virus')
        .order('scientific_name')

      if (analytesError) throw analytesError
      setAvailableAnalytes(analytesData || [])

      // Fetch microorganisms for phytopathology (fungi, bacteria)
      const { data: microorganismsData, error: microorganismsError } = await supabase
        .from('analytes')
        .select('id, scientific_name')
        .in('type', ['hongo', 'bacteria'])
        .order('scientific_name')

      if (microorganismsError) throw microorganismsError
      setAvailableMicroorganisms(microorganismsData || [])

      // Fetch nematodes for nematology
      const { data: nematodesData, error: nematodesError } = await supabase
        .from('analytes')
        .select('id, scientific_name')
        .eq('type', 'nematodo')
        .order('scientific_name')

      if (nematodesError) throw nematodesError
      setAvailableNematodes(nematodesData || [])

      // Fetch bacteria for bacteriology
      const { data: bacteriaData, error: bacteriaError } = await supabase
        .from('analytes')
        .select('id, scientific_name')
        .eq('type', 'bacteria')
        .order('scientific_name')

      if (bacteriaError) throw bacteriaError
      setAvailableBacteria(bacteriaData || [])
    } catch (error) {
      console.error('Error fetching methods and analytes:', error)
    } finally {
      setLoadingMethodsAndAnalytes(false)
    }
  }, [supabase, user?.company_id])

  // Handle nematology negative result autocomplete
  useEffect(() => {
    if (selectedAnalysisArea.toLowerCase().includes('nematolog') && formData.result_type === 'negative') {
      setFormData(prev => ({
        ...prev,
        pathogen_identified: 'Nematodos no fitoparásitos (benéficos)',
        pathogen_type: 'nematode'
      }))
    }
  }, [selectedAnalysisArea, formData.result_type])

  // Handle virología pathogen type
  useEffect(() => {
    if (selectedAnalysisArea.toLowerCase().includes('virolog')) {
      setFormData(prev => ({
        ...prev,
        pathogen_type: 'virus'
      }))
      // Fetch methods and analytes for virología
      fetchMethodsAndAnalytes()
    }
  }, [selectedAnalysisArea, fetchMethodsAndAnalytes])

  // Handle bacteriología pathogen type and data fetching
  useEffect(() => {
    if (selectedAnalysisArea.toLowerCase().includes('bacteriolog')) {
      setFormData(prev => ({
        ...prev,
        pathogen_type: 'bacteria'
      }))
      fetchMethodsAndAnalytes()
    }
  }, [selectedAnalysisArea, fetchMethodsAndAnalytes])

  // Handle fitopatología pathogen type and data fetching
  useEffect(() => {
    if (selectedAnalysisArea.toLowerCase().includes('fitopatolog')) {
      // Fetch methods and microorganisms for fitopatología
      fetchMethodsAndAnalytes()
    }
  }, [selectedAnalysisArea, fetchMethodsAndAnalytes])

  // Handle detección precoz data fetching
  useEffect(() => {
    if (selectedAnalysisArea.toLowerCase().includes('deteccion') || selectedAnalysisArea.toLowerCase().includes('precoz')) {
      const selectedSample = samples.find(s => s.id === formData.sample_id)
      
      // Map suspected pathogen to pathogen type
      let pathogenType = 'fungus' // Default to fungus for early detection
      if (selectedSample?.suspected_pathogen) {
        // Map common pathogen types
        const pathogen = selectedSample.suspected_pathogen.toLowerCase()
        if (pathogen.includes('botrytis') || pathogen.includes('fungus') || pathogen.includes('hongo')) {
          pathogenType = 'fungus'
        } else if (pathogen.includes('bacteria') || pathogen.includes('bacteri')) {
          pathogenType = 'bacteria'
        } else if (pathogen.includes('virus')) {
          pathogenType = 'virus'
        } else if (pathogen.includes('nematod')) {
          pathogenType = 'nematode'
        } else if (pathogen.includes('insect') || pathogen.includes('insecto')) {
          pathogenType = 'insect'
        } else if (pathogen.includes('abiotic') || pathogen.includes('abiótico')) {
          pathogenType = 'abiotic'
        } else {
          pathogenType = 'fungus' // Default to fungus for early detection
        }
      }
      
      setFormData(prev => ({
        ...prev,
        pathogen_type: pathogenType,
        pathogen_identified: selectedSample?.suspected_pathogen || ''
      }))
    }
  }, [selectedAnalysisArea, formData.sample_id, samples])

  // Handle nematología data fetching
  useEffect(() => {
    if (selectedAnalysisArea.toLowerCase().includes('nematolog')) {
      // Fetch nematodes for nematología
      fetchMethodsAndAnalytes()
    }
  }, [selectedAnalysisArea, fetchMethodsAndAnalytes])

  // Generate identification for virología
  useEffect(() => {
    if (selectedAnalysisArea.toLowerCase().includes('virolog') && formData.sample_id) {
      const selectedSample = samples.find(s => s.id === formData.sample_id)
      if (selectedSample?.code) {
        setVirologyData(prev => ({
          ...prev,
          tests: prev.tests.map((test, index) => ({
            ...test,
            identification: test.identification || `${selectedSample.code}-${index + 1}`
          }))
        }))
      }
    }
  }, [selectedAnalysisArea, formData.sample_id, samples])

  // Generate identification for bacteriología
  useEffect(() => {
    if (selectedAnalysisArea.toLowerCase().includes('bacteriolog') && formData.sample_id) {
      const selectedSample = samples.find(s => s.id === formData.sample_id)
      if (selectedSample?.code) {
        setBacteriologyData(prev => ({
          ...prev,
          tests: prev.tests.map((test, index) => ({
            ...test,
            identification: test.identification || `${selectedSample.code}-${index + 1}`
          }))
        }))
      }
    }
  }, [selectedAnalysisArea, formData.sample_id, samples])

  // Generate identification for fitopatología
  useEffect(() => {
    if (selectedAnalysisArea.toLowerCase().includes('fitopatolog') && formData.sample_id) {
      const selectedSample = samples.find(s => s.id === formData.sample_id)
      if (selectedSample?.code) {
        setPhytopathologyData(prev => ({
          ...prev,
          tests: prev.tests.map((test, index) => ({
            ...test,
            identification: test.identification || `${selectedSample.code}-${index + 1}`
          }))
        }))
      }
    }
  }, [selectedAnalysisArea, formData.sample_id, samples])

  // Generate sample code and identification for detección precoz
  useEffect(() => {
    if ((selectedAnalysisArea.toLowerCase().includes('deteccion') || selectedAnalysisArea.toLowerCase().includes('precoz')) && formData.sample_id) {
      const selectedSample = samples.find(s => s.id === formData.sample_id)
      if (selectedSample?.code) {
        setEarlyDetectionData(prev => ({
          ...prev,
          tests: prev.tests.map((test, index) => ({
            ...test,
            sample_code: selectedSample.code || '',
            identification: test.identification || `${selectedSample.code}-${index + 1}`
          }))
        }))
      }
    }
  }, [selectedAnalysisArea, formData.sample_id, samples])

  // Auto-populate findings JSON for nematology
  useEffect(() => {
    if (selectedAnalysisArea.toLowerCase().includes('nematolog')) {
      let nematologyFindings = null

      if (formData.result_type === 'negative' && nematologyData.negativeQuantity) {
        nematologyFindings = {
          type: 'nematologia_negative',
          nematodes: [{
            name: formData.pathogen_identified,
            quantity: nematologyData.negativeQuantity
          }]
        }
      } else if (formData.result_type === 'positive') {
        const validNematodes = nematologyData.positiveNematodes.filter(n => n.name.trim() !== '')
        if (validNematodes.length > 0) {
          nematologyFindings = {
            type: 'nematologia_positive',
            nematodes: validNematodes
          }
        }
      }

      if (nematologyFindings) {
        setFormData(prev => ({
          ...prev,
          findings: JSON.stringify(nematologyFindings, null, 2)
        }))
      } else if (formData.result_type) {
        setFormData(prev => ({
          ...prev,
          findings: ''
        }))
      }
    }
  }, [selectedAnalysisArea, formData.result_type, formData.pathogen_identified, nematologyData])

  // Auto-populate findings JSON for virology
  useEffect(() => {
    if (selectedAnalysisArea.toLowerCase().includes('virolog')) {
      const validTests = virologyData.tests.filter(test => 
        test.method && test.virus && test.result
      )

      if (validTests.length > 0) {
        const testsWithNames = validTests.map(test => {
          const methodName = availableMethods.find(m => m.id == test.method)?.name || test.method
          const virusName = availableAnalytes.find(a => a.id == test.virus)?.scientific_name || test.virus
          return { ...test, method: methodName, virus: virusName }
        })
        const virologyFindings = {
          type: 'virologia',
          tests: testsWithNames
        }

        setFormData(prev => ({
          ...prev,
          findings: JSON.stringify(virologyFindings, null, 2)
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          findings: ''
        }))
      }
    }
  }, [selectedAnalysisArea, virologyData, availableMethods, availableAnalytes])

  // Auto-populate findings JSON for bacteriology (similar to virology)
  useEffect(() => {
    if (selectedAnalysisArea.toLowerCase().includes('bacteriolog')) {
      const validTests = bacteriologyData.tests.filter(test => 
        test.method && test.microorganism && test.result
      )

      if (validTests.length > 0) {
        const testsWithNames = validTests.map(test => {
          const methodName = availableMethods.find(m => m.id == test.method)?.name || test.method
          const bacteriaName = availableBacteria.find(a => a.id == test.microorganism)?.scientific_name || test.microorganism
          return { ...test, method: methodName, microorganism: bacteriaName }
        })
        const bacteriologyFindings = {
          type: 'bacteriologia',
          tests: testsWithNames
        }

        setFormData(prev => ({
          ...prev,
          findings: JSON.stringify(bacteriologyFindings, null, 2)
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          findings: ''
        }))
      }
    }
  }, [selectedAnalysisArea, bacteriologyData, availableMethods, availableBacteria])

  // Auto-populate findings JSON for early detection
  useEffect(() => {
    if (selectedAnalysisArea.toLowerCase().includes('deteccion') || selectedAnalysisArea.toLowerCase().includes('precoz')) {
      const validTests = earlyDetectionData.tests.filter(test => 
        test.sample_code && test.identification && test.variety && test.units_evaluated
      )

      if (validTests.length > 0) {
        const earlyDetectionFindings = {
          type: 'deteccion_precoz',
          tests: validTests
        }

        setFormData(prev => ({
          ...prev,
          findings: JSON.stringify(earlyDetectionFindings, null, 2)
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          findings: ''
        }))
      }
    }
  }, [selectedAnalysisArea, earlyDetectionData])

  // Auto-populate findings JSON for phytopathology
  useEffect(() => {
    if (selectedAnalysisArea.toLowerCase().includes('fitopatolog')) {
      const validTests = phytopathologyData.tests.filter(test => 
        test.microorganism && (test.dilutions['10-1'] || test.dilutions['10-2'] || test.dilutions['10-3'])
      )

      if (validTests.length > 0) {
        const testsWithNames = mapAnalysisIdsToNames(validTests, 'phytopathology', availableMethods, availableAnalytes, availableMicroorganisms)
        const phytopathologyFindings = {
          type: 'fitopatologia',
          tests: testsWithNames
        }

        setFormData(prev => ({
          ...prev,
          findings: JSON.stringify(phytopathologyFindings, null, 2)
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          findings: ''
        }))
      }
    }
  }, [selectedAnalysisArea, phytopathologyData, availableMethods, availableAnalytes, availableMicroorganisms])

  const addNematodeEntry = () => {
    setNematologyData(prev => ({
      ...prev,
      positiveNematodes: [...prev.positiveNematodes, { name: '', quantity: '' }]
    }))
  }

  const removeNematodeEntry = (index: number) => {
    setNematologyData(prev => ({
      ...prev,
      positiveNematodes: prev.positiveNematodes.filter((_, i) => i !== index)
    }))
  }

  const updateNematodeEntry = (index: number, field: 'name' | 'quantity', value: string) => {
    setNematologyData(prev => ({
      ...prev,
      positiveNematodes: prev.positiveNematodes.map((nematode, i) =>
        i === index ? { ...nematode, [field]: value } : nematode
      )
    }))
  }

  // Virology test management functions
  const addVirologyTest = () => {
    const selectedSample = samples.find(s => s.id === formData.sample_id)
    const sampleCode = selectedSample?.code || 'SAMPLE'
    
    setVirologyData(prev => ({
      ...prev,
      tests: [...prev.tests, { 
        identification: `${sampleCode}-${prev.tests.length + 1}`,
        method: '', 
        virus: '', 
        result: '' 
      }]
    }))
  }

  // Bacteriology test management functions
  const addBacteriologyTest = () => {
    const selectedSample = samples.find(s => s.id === formData.sample_id)
    const sampleCode = selectedSample?.code || 'SAMPLE'
    
    setBacteriologyData(prev => ({
      ...prev,
      tests: [...prev.tests, { 
        identification: `${sampleCode}-${prev.tests.length + 1}`,
        method: '', 
        microorganism: '', 
        result: '' 
      }]
    }))
  }

  const removeBacteriologyTest = (index: number) => {
    setBacteriologyData(prev => {
      const newTests = prev.tests.filter((_, i) => i !== index)
      const selectedSample = samples.find(s => s.id === formData.sample_id)
      const sampleCode = selectedSample?.code || 'SAMPLE'
      
      return {
        ...prev,
        tests: newTests.map((test, i) => ({
          ...test,
          identification: `${sampleCode}-${i + 1}`
        }))
      }
    })
  }

  const updateBacteriologyTest = (index: number, field: 'identification' | 'method' | 'microorganism' | 'result', value: string) => {
    setBacteriologyData(prev => ({
      ...prev,
      tests: prev.tests.map((test, i) =>
        i === index ? { ...test, [field]: value } : test
      )
    }))
  }

  const removeVirologyTest = (index: number) => {
    setVirologyData(prev => {
      const newTests = prev.tests.filter((_, i) => i !== index)
      const selectedSample = samples.find(s => s.id === formData.sample_id)
      const sampleCode = selectedSample?.code || 'SAMPLE'
      
      // Regenerate identifications
      return {
        ...prev,
        tests: newTests.map((test, i) => ({
          ...test,
          identification: `${sampleCode}-${i + 1}`
        }))
      }
    })
  }

  const updateVirologyTest = (index: number, field: 'identification' | 'method' | 'virus' | 'result', value: string) => {
    setVirologyData(prev => ({
      ...prev,
      tests: prev.tests.map((test, i) =>
        i === index ? { ...test, [field]: value } : test
      )
    }))
  }

  // Phytopathology test management functions
  const addPhytopathologyTest = () => {
    const selectedSample = samples.find(s => s.id === formData.sample_id)
    const sampleCode = selectedSample?.code || 'SAMPLE'
    
    setPhytopathologyData(prev => ({
      ...prev,
      tests: [...prev.tests, { 
        identification: `${sampleCode}-${prev.tests.length + 1}`,
        microorganism: '', 
        dilutions: {
          '10-1': '',
          '10-2': '',
          '10-3': ''
        }
      }]
    }))
  }

  const removePhytopathologyTest = (index: number) => {
    setPhytopathologyData(prev => {
      const newTests = prev.tests.filter((_, i) => i !== index)
      const selectedSample = samples.find(s => s.id === formData.sample_id)
      const sampleCode = selectedSample?.code || 'SAMPLE'
      
      // Regenerate identifications
      return {
        ...prev,
        tests: newTests.map((test, i) => ({
          ...test,
          identification: `${sampleCode}-${i + 1}`
        }))
      }
    })
  }

  // Early detection test management functions
  const addEarlyDetectionTest = () => {
    const selectedSample = samples.find(s => s.id === formData.sample_id)
    const sampleCode = selectedSample?.code || 'SAMPLE'
    
    setEarlyDetectionData(prev => ({
      ...prev,
      tests: [...prev.tests, { 
        sample_code: sampleCode,
        identification: `${sampleCode}-${prev.tests.length + 1}`, 
        variety: '', 
        units_evaluated: '', 
        severity_scale: { '0': '', '1': '', '2': '', '3': '' }
      }]
    }))
  }

  const removeEarlyDetectionTest = (index: number) => {
    setEarlyDetectionData(prev => {
      const newTests = prev.tests.filter((_, i) => i !== index)
      const selectedSample = samples.find(s => s.id === formData.sample_id)
      const sampleCode = selectedSample?.code || 'SAMPLE'
      
      // Regenerate identifications
      return {
        ...prev,
        tests: newTests.map((test, i) => ({
          ...test,
          identification: `${sampleCode}-${i + 1}`
        }))
      }
    })
  }

  const updateEarlyDetectionTest = (index: number, field: string, value: string) => {
    setEarlyDetectionData(prev => ({
      ...prev,
      tests: prev.tests.map((test, i) => 
        i === index ? { ...test, [field]: value } : test
      )
    }))
  }

  const updateEarlyDetectionSeverityScale = (index: number, scale: string, value: string) => {
    setEarlyDetectionData(prev => ({
      ...prev,
      tests: prev.tests.map((test, i) => 
        i === index ? { 
          ...test, 
          severity_scale: { ...test.severity_scale, [scale]: value }
        } : test
      )
    }))
  }

  const updatePhytopathologyTest = (index: number, field: 'identification' | 'microorganism' | string, value: string) => {
    setPhytopathologyData(prev => ({
      ...prev,
      tests: prev.tests.map((test, i) => {
        if (i === index) {
          if (field === 'microorganism') {
            return { ...test, microorganism: value }
          } else if (field === 'identification') {
            return { ...test, identification: value }
          } else if (field.startsWith('dilution-')) {
            const dilutionKey = field.replace('dilution-', '')
            return {
              ...test,
              dilutions: {
                ...test.dilutions,
                [dilutionKey]: value
              }
            }
          }
        }
        return test
      })
    }))
  }

  const handleMethodologyChange = (methodology: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      methodologies: checked 
        ? [...prev.methodologies, methodology]
        : prev.methodologies.filter(m => m !== methodology)
    }))
  }

  const handleIdentificationTechniqueChange = (technique: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      identification_techniques: checked 
        ? [...prev.identification_techniques, technique]
        : prev.identification_techniques.filter(t => t !== technique)
    }))
  }

  const renderResultFormatFields = () => {
    const isNematology = selectedAnalysisArea.toLowerCase().includes('nematolog')
    const isVirology = selectedAnalysisArea.toLowerCase().includes('virolog')
    const isPhytopathology = selectedAnalysisArea.toLowerCase().includes('fitopatolog')
    const isEarlyDetection = selectedAnalysisArea.toLowerCase().includes('deteccion') || selectedAnalysisArea.toLowerCase().includes('precoz')

    if (isPhytopathology) {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Resultado
            </label>
            <select
              value={formData.result_type}
              onChange={(e) => setFormData(prev => ({ ...prev, result_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Seleccionar tipo</option>
              <option value="positive">Positivo</option>
              <option value="negative">Negativo</option>
              <option value="inconclusive">No conclusivo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confianza
            </label>
            <select
              value={formData.confidence}
              onChange={(e) => setFormData(prev => ({ ...prev, confidence: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Seleccionar confianza</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Patógeno
            </label>
            <select
              value={formData.pathogen_type}
              onChange={(e) => setFormData(prev => ({ ...prev, pathogen_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Seleccionar tipo</option>
              <option value="fungus">Hongo</option>
              <option value="bacteria">Bacteria</option>
              <option value="mixed">Mixto</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severidad
            </label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Seleccionar severidad</option>
              <option value="low">Baja</option>
              <option value="moderate">Moderada</option>
              <option value="high">Alta</option>
              <option value="severe">Severa</option>
            </select>
          </div>

          

          {/* Phytopathology Tests Table */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Recuento de Microorganismos
              </label>
              <button
                type="button"
                onClick={addPhytopathologyTest}
                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Plus className="h-3 w-3 mr-1" />
                Agregar
              </button>
            </div>
            
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-green-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        N° de muestra
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Identificación de la muestra
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Microorganismo Identificado
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan={3}>
                        Recuento de microorganismos (N° de colonias/dilución)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                    <tr className="bg-green-100">
                      <th colSpan={3}></th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                        Dilución utilizada
                      </th>
                      <th colSpan={2}></th>
                      <th></th>
                    </tr>
                    <tr className="bg-green-100">
                      <th colSpan={3}></th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                        10⁻¹
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                        10⁻²
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                        10⁻³
                      </th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {phytopathologyData.tests.map((test, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-mono">
                          {index + 1}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          <input
                            type="text"
                            value={test.identification}
                            onChange={(e) => updatePhytopathologyTest(index, 'identification', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <select
                            value={test.microorganism}
                            onChange={(e) => updatePhytopathologyTest(index, 'microorganism', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            disabled={loadingMethodsAndAnalytes}
                          >
                            <option value="">Seleccionar microorganismo</option>
                            {availableMicroorganisms.map(microorganism => (
                              <option key={microorganism.id} value={microorganism.id}>
                                {microorganism.scientific_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={test.dilutions['10-1']}
                            onChange={(e) => updatePhytopathologyTest(index, 'dilution-10-1', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={test.dilutions['10-2']}
                            onChange={(e) => updatePhytopathologyTest(index, 'dilution-10-2', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="text"
                            value={test.dilutions['10-3']}
                            onChange={(e) => updatePhytopathologyTest(index, 'dilution-10-3', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {phytopathologyData.tests.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePhytopathologyTest(index)}
                              className="text-red-600 hover:text-red-900 text-sm"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {loadingMethodsAndAnalytes && (
                <div className="px-4 py-2 text-sm text-gray-500 text-center">
                  Cargando microorganismos...
                </div>
              )}
            </div>
          </div>
        </>
      )
    }

    if (isVirology) {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Resultado
            </label>
            <select
              value={formData.result_type}
              onChange={(e) => setFormData(prev => ({ ...prev, result_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Seleccionar tipo</option>
              <option value="positive">Positivo</option>
              <option value="negative">Negativo</option>
              <option value="inconclusive">No conclusivo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confianza
            </label>
            <select
              value={formData.confidence}
              onChange={(e) => setFormData(prev => ({ ...prev, confidence: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Seleccionar confianza</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Patógeno
            </label>
            <input
              type="text"
              value="Virus"
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severidad
            </label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Seleccionar severidad</option>
              <option value="low">Baja</option>
              <option value="moderate">Moderada</option>
              <option value="high">Alta</option>
              <option value="severe">Severa</option>
            </select>
          </div>

          

          {/* Virology Tests Table */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Pruebas Virológicas
              </label>
              <button
                type="button"
                onClick={addVirologyTest}
                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Plus className="h-3 w-3 mr-1" />
                Agregar
              </button>
            </div>
            
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Identificación
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Técnica utilizada
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Virus
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resultado
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {virologyData.tests.map((test, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-mono">
                          <input
                            type="text"
                            value={test.identification}
                            onChange={(e) => updateVirologyTest(index, 'identification', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <select
                            value={test.method}
                            onChange={(e) => updateVirologyTest(index, 'method', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            disabled={loadingMethodsAndAnalytes}
                          >
                            <option value="">Seleccionar método</option>
                            {availableMethods.map(method => (
                              <option key={method.id} value={method.id}>
                                {method.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <select
                            value={test.virus}
                            onChange={(e) => updateVirologyTest(index, 'virus', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            disabled={loadingMethodsAndAnalytes}
                          >
                            <option value="">Seleccionar virus</option>
                            {availableAnalytes.map(analyte => (
                              <option key={analyte.id} value={analyte.id}>
                                {analyte.scientific_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <select
                            value={test.result}
                            onChange={(e) => updateVirologyTest(index, 'result', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          >
                            <option value="">Resultado</option>
                            <option value="positive">Positivo</option>
                            <option value="negative">Negativo</option>
                          </select>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {virologyData.tests.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeVirologyTest(index)}
                              className="text-red-600 hover:text-red-900 text-sm"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {loadingMethodsAndAnalytes && (
                <div className="px-4 py-2 text-sm text-gray-500 text-center">
                  Cargando métodos y analitos...
                </div>
              )}
            </div>
          </div>
        </>
      )
    }

    // Bacteriology UI (similar to virology but microorganisms=bacteria)
    if (selectedAnalysisArea.toLowerCase().includes('bacteriolog')) {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Resultado
            </label>
            <select
              value={formData.result_type}
              onChange={(e) => setFormData(prev => ({ ...prev, result_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Seleccionar tipo</option>
              <option value="positive">Positivo</option>
              <option value="negative">Negativo</option>
              <option value="inconclusive">No conclusivo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confianza
            </label>
            <select
              value={formData.confidence}
              onChange={(e) => setFormData(prev => ({ ...prev, confidence: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Seleccionar confianza</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Patógeno
            </label>
            <input
              type="text"
              value="Bacteria"
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severidad
            </label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Seleccionar severidad</option>
              <option value="low">Baja</option>
              <option value="moderate">Moderada</option>
              <option value="high">Alta</option>
              <option value="severe">Severa</option>
            </select>
          </div>

          

          {/* Bacteriology Tests Table */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Pruebas Bacteriológicas
              </label>
              <button
                type="button"
                onClick={addBacteriologyTest}
                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Plus className="h-3 w-3 mr-1" />
                Agregar
              </button>
            </div>
            
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Identificación
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Técnica utilizada
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bacteria
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Resultado
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bacteriologyData.tests.map((test, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-mono">
                          <input
                            type="text"
                            value={test.identification}
                            onChange={(e) => updateBacteriologyTest(index, 'identification', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <select
                            value={test.method}
                            onChange={(e) => updateBacteriologyTest(index, 'method', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            disabled={loadingMethodsAndAnalytes}
                          >
                            <option value="">Seleccionar método</option>
                            {availableMethods.map(method => (
                              <option key={method.id} value={method.id}>
                                {method.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <select
                            value={test.microorganism}
                            onChange={(e) => updateBacteriologyTest(index, 'microorganism', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            disabled={loadingMethodsAndAnalytes}
                          >
                            <option value="">Seleccionar bacteria</option>
                            {availableBacteria.map(analyte => (
                              <option key={analyte.id} value={analyte.id}>
                                {analyte.scientific_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <select
                            value={test.result}
                            onChange={(e) => updateBacteriologyTest(index, 'result', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          >
                            <option value="">Resultado</option>
                            <option value="positive">Positivo</option>
                            <option value="negative">Negativo</option>
                          </select>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {bacteriologyData.tests.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeBacteriologyTest(index)}
                              className="text-red-600 hover:text-red-900 text-sm"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {loadingMethodsAndAnalytes && (
                <div className="px-4 py-2 text-sm text-gray-500 text-center">
                  Cargando métodos y bacterias...
                </div>
              )}
            </div>
          </div>
        </>
      )
    }

    if (isNematology) {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Resultado
            </label>
            <select
              value={formData.result_type}
              onChange={(e) => setFormData(prev => ({ ...prev, result_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Seleccionar tipo</option>
              <option value="positive">Positivo</option>
              <option value="negative">Negativo</option>
              <option value="inconclusive">No conclusivo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confianza
            </label>
            <select
              value={formData.confidence}
              onChange={(e) => setFormData(prev => ({ ...prev, confidence: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Seleccionar confianza</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Patógeno
            </label>
            <input
              type="text"
              value="Nematodo"
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severidad
            </label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Seleccionar severidad</option>
              <option value="low">Baja</option>
              <option value="moderate">Moderada</option>
              <option value="high">Alta</option>
              <option value="severe">Severa</option>
            </select>
          </div>

          

          {/* Nematology-specific fields */}
          {formData.result_type === 'negative' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patógeno Identificado
                </label>
                <input
                  type="text"
                  value={formData.pathogen_identified}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad
                </label>
                <input
                  type="text"
                  value={nematologyData.negativeQuantity}
                  onChange={(e) => setNematologyData(prev => ({ ...prev, negativeQuantity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Cantidad de nematodos no fitoparásitos"
                />
              </div>
            </>
          )}

          {formData.result_type === 'positive' && (
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Nematodos Identificados
                </label>
                <button
                  type="button"
                  onClick={addNematodeEntry}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar
                </button>
              </div>
              
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-green-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Género y/o especie identificada
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          N° nematodos/250 cm³ de suelo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {nematologyData.positiveNematodes.map((nematode, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={nematode.name}
                              onChange={(e) => updateNematodeEntry(index, 'name', e.target.value)}
                              className="w-full text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              disabled={loadingMethodsAndAnalytes}
                            >
                              <option value="">Seleccionar nematodo</option>
                              {availableNematodes.map(nematode => (
                                <option key={nematode.id} value={nematode.scientific_name}>
                                  {nematode.scientific_name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="text"
                              value={nematode.quantity}
                              onChange={(e) => updateNematodeEntry(index, 'quantity', e.target.value)}
                              className="w-full text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {nematologyData.positiveNematodes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeNematodeEntry(index)}
                                className="text-red-600 hover:text-red-900 text-sm"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {loadingMethodsAndAnalytes && (
                  <div className="px-4 py-2 text-sm text-gray-500 text-center">
                    Cargando nematodos...
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )
    }

    // Base fields for other analysis types
    const baseFields = (
      <>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Resultado
          </label>
          <select
            value={formData.result_type}
            onChange={(e) => setFormData(prev => ({ ...prev, result_type: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Seleccionar tipo</option>
            <option value="positive">Positivo</option>
            <option value="negative">Negativo</option>
            <option value="inconclusive">No conclusivo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confianza
          </label>
          <select
            value={formData.confidence}
            onChange={(e) => setFormData(prev => ({ ...prev, confidence: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Seleccionar confianza</option>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Patógeno Identificado
          </label>
          <input
            type="text"
            value={formData.pathogen_identified}
            onChange={(e) => setFormData(prev => ({ ...prev, pathogen_identified: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Nombre del patógeno"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Patógeno
          </label>
          <select
            value={formData.pathogen_type}
            onChange={(e) => setFormData(prev => ({ ...prev, pathogen_type: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Seleccionar tipo</option>
            <option value="fungus">Hongo</option>
            <option value="bacteria">Bacteria</option>
            <option value="virus">Virus</option>
            <option value="nematode">Nematodo</option>
            <option value="insect">Insecto</option>
            <option value="abiotic">Abiótico</option>
            <option value="unknown">Desconocido</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Severidad
          </label>
          <select
            value={formData.severity}
            onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="">Seleccionar severidad</option>
            <option value="low">Baja</option>
            <option value="moderate">Moderada</option>
            <option value="high">Alta</option>
            <option value="severe">Severa</option>
          </select>
        </div>

      </>
    )

    // Early Detection UI
    if (isEarlyDetection) {
      return (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Resultado
            </label>
            <select
              value={formData.result_type}
              onChange={(e) => setFormData(prev => ({ ...prev, result_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Seleccionar tipo</option>
              <option value="positive">Positivo</option>
              <option value="negative">Negativo</option>
              <option value="inconclusive">No conclusivo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confianza
            </label>
            <select
              value={formData.confidence}
              onChange={(e) => setFormData(prev => ({ ...prev, confidence: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Seleccionar confianza</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Patógeno
            </label>
            <input
              type="text"
              value={formData.pathogen_type === 'fungus' ? 'Hongo' : 
                     formData.pathogen_type === 'bacteria' ? 'Bacteria' :
                     formData.pathogen_type === 'virus' ? 'Virus' :
                     formData.pathogen_type === 'nematode' ? 'Nematodo' :
                     'Detección Precoz'}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Severidad
            </label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Seleccionar severidad</option>
              <option value="low">Baja</option>
              <option value="moderate">Moderada</option>
              <option value="high">Alta</option>
              <option value="severe">Severa</option>
            </select>
          </div>

          {/* Early Detection Tests Table */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Evaluación de Detección Precoz
              </label>
              <button
                type="button"
                onClick={addEarlyDetectionTest}
                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Plus className="h-3 w-3 mr-1" />
                Agregar
              </button>
            </div>
            
            <div className="bg-white border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Código Muestra
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Identificación
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Variedad
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unidades Evaluadas
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan={4}>
                        Escala de Severidad
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                    <tr>
                      <th></th>
                      <th></th>
                      <th></th>
                      <th></th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l">
                        0
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        1
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        2
                      </th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        3
                      </th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {earlyDetectionData.tests.map((test, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-mono">
                          <input
                            type="text"
                            value={test.sample_code}
                            onChange={(e) => updateEarlyDetectionTest(index, 'sample_code', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Código muestra"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          <input
                            type="text"
                            value={test.identification}
                            onChange={(e) => updateEarlyDetectionTest(index, 'identification', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Identificación"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          <input
                            type="text"
                            value={test.variety}
                            onChange={(e) => updateEarlyDetectionTest(index, 'variety', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Variedad"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          <input
                            type="number"
                            value={test.units_evaluated}
                            onChange={(e) => updateEarlyDetectionTest(index, 'units_evaluated', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Unidades"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <input
                            type="number"
                            value={test.severity_scale['0']}
                            onChange={(e) => updateEarlyDetectionSeverityScale(index, '0', e.target.value)}
                            className="w-16 text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <input
                            type="number"
                            value={test.severity_scale['1']}
                            onChange={(e) => updateEarlyDetectionSeverityScale(index, '1', e.target.value)}
                            className="w-16 text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <input
                            type="number"
                            value={test.severity_scale['2']}
                            onChange={(e) => updateEarlyDetectionSeverityScale(index, '2', e.target.value)}
                            className="w-16 text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-center">
                          <input
                            type="number"
                            value={test.severity_scale['3']}
                            onChange={(e) => updateEarlyDetectionSeverityScale(index, '3', e.target.value)}
                            className="w-16 text-sm border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {earlyDetectionData.tests.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEarlyDetectionTest(index)}
                              className="text-red-600 hover:text-red-900 text-sm"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )
    }

    return baseFields
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!formData.sample_id || !formData.sample_test_id) {
        alert('Debe seleccionar una muestra y un análisis')
        return
      }

      if (formData.methodologies.length === 0 || formData.identification_techniques.length === 0) {
        alert('Debe seleccionar al menos una metodología y una técnica de identificación')
        return
      }

      const isNematology = selectedAnalysisArea.toLowerCase().includes('nematolog')
      const isVirology = selectedAnalysisArea.toLowerCase().includes('virolog')
      const isPhytopathology = selectedAnalysisArea.toLowerCase().includes('fitopatolog')
      const isEarlyDetection = selectedAnalysisArea.toLowerCase().includes('deteccion') || selectedAnalysisArea.toLowerCase().includes('precoz')
      let findings = null

      // Structure nematology data into JSON
      if (isNematology) {
        if (formData.result_type === 'negative') {
          findings = {
            type: 'nematologia_negative',
            nematodes: [{
              name: formData.pathogen_identified,
              quantity: nematologyData.negativeQuantity
            }]
          }
        } else if (formData.result_type === 'positive') {
          findings = {
            type: 'nematologia_positive',
            nematodes: nematologyData.positiveNematodes.filter(n => n.name.trim() !== '')
          }
        }
      } else if (isVirology) {
        // Structure virology data into JSON
        const validTests = virologyData.tests.filter(test => 
          test.method && test.virus && test.result
        )
        if (validTests.length > 0) {
          findings = {
            type: 'virologia',
            tests: mapAnalysisIdsToNames(validTests, 'virology', availableMethods, availableAnalytes, availableMicroorganisms)
          }
        }
    } else if (isPhytopathology) {
        // Structure phytopathology data into JSON
        const validTests = phytopathologyData.tests.filter(test => 
          test.microorganism && (test.dilutions['10-1'] || test.dilutions['10-2'] || test.dilutions['10-3'])
        )
        if (validTests.length > 0) {
          findings = {
            type: 'fitopatologia',
            tests: mapAnalysisIdsToNames(validTests, 'phytopathology', availableMethods, availableAnalytes, availableMicroorganisms)
          }
        }
    } else if (selectedAnalysisArea.toLowerCase().includes('bacteriolog')) {
      // Structure bacteriology data into JSON (similar to virology)
      const validTests = bacteriologyData.tests.filter(test => 
        test.method && test.microorganism && test.result
      )
      if (validTests.length > 0) {
        const testsWithNames = validTests.map(test => {
          const methodName = availableMethods.find(m => m.id == test.method)?.name || test.method
          const bacteriaName = availableBacteria.find(a => a.id == test.microorganism)?.scientific_name || test.microorganism
          return { ...test, method: methodName, microorganism: bacteriaName }
        })
        findings = {
          type: 'bacteriologia',
          tests: testsWithNames
        }
      }
    } else if (isEarlyDetection) {
      // Structure early detection data into JSON
      const validTests = earlyDetectionData.tests.filter(test => 
        test.sample_code && test.identification && test.variety && test.units_evaluated
      )
      if (validTests.length > 0) {
        findings = {
          type: 'deteccion_precoz',
          tests: validTests
        }
      }
      } else if (formData.findings) {
        try {
          findings = JSON.parse(formData.findings)
        } catch {
          alert('Error en el formato JSON de hallazgos técnicos')
          return
        }
      }

      const url = resultId ? `/api/results/${resultId}` : '/api/results'
      const method = resultId ? 'PATCH' : 'POST'

      const requestBody: Record<string, unknown> = {
        sample_id: formData.sample_id,
        sample_test_id: formData.sample_test_id,
        methodology: formData.methodology || null,
        methodologies: formData.methodologies,
        identification_techniques: formData.identification_techniques,
        findings: findings,
        conclusion: formData.conclusion || null,
        diagnosis: formData.diagnosis || null,
        pathogen_identified: formData.pathogen_identified || null,
        pathogen_type: isNematology ? 'nematode' : (isVirology ? 'virus' : (formData.pathogen_type || null)),
        severity: formData.severity || null,
        confidence: formData.confidence || null,
        result_type: formData.result_type || null,
        recommendations: formData.recommendations || null
      }

      // Only include test_area for new results (it's set during creation)
      if (!resultId && selectedAnalysisArea) {
        requestBody.test_area = selectedAnalysisArea
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || (resultId ? 'Failed to update result' : 'Failed to create result'))
      }

      onSuccess()
      onClose()
      
      // Reset form only if creating new result
      if (!resultId) {
        setFormData({
          sample_id: preselectedSampleId || '',
          sample_test_id: '',
          methodology: '',
          methodologies: [],
          identification_techniques: [],
          findings: '',
          conclusion: '',
          diagnosis: '',
          pathogen_identified: '',
          pathogen_type: '',
          severity: '',
          confidence: '',
          result_type: '',
          recommendations: ''
        })
        
        // Reset nematology data
        setNematologyData({
          negativeQuantity: '',
          positiveNematodes: [{ name: '', quantity: '' }]
        })
        
        // Reset virology data
        setVirologyData({
          tests: [{ identification: '', method: '', virus: '', result: '' }]
        })
        
        // Reset phytopathology data
        setPhytopathologyData({
          tests: [{ 
            identification: '', 
            microorganism: '', 
            dilutions: {
              '10-1': '',
              '10-2': '',
              '10-3': ''
            }
          }]
        })
      }
    } catch (error: unknown) {
      console.error(`Error ${resultId ? 'updating' : 'creating'} result:`, error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      setValidationError(`Error al ${resultId ? 'actualizar' : 'crear'} el resultado: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const selectedSample = samples.find(s => s.id === formData.sample_id)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <FlaskConical className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {resultId ? 'Editar Resultado' : 'Nuevo Resultado'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {resultId ? 'Modifica la información del resultado' : 'Registrar el resultado de un análisis de laboratorio'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Validation Error Display */}
            {validationError && (
              <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                <p className="text-sm text-red-800">{validationError}</p>
              </div>
            )}

            {isLoadingResult ? (
              <div className="bg-white px-6 py-12 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                <span className="ml-2 text-gray-600">Cargando datos del resultado...</span>
              </div>
            ) : (
            <div className="bg-white px-6 py-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Sample Selection */}
                <div className="sm:col-span-2">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Selección de Muestra y Análisis</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Muestra *
                  </label>
                  <select
                    required
                    value={formData.sample_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, sample_id: e.target.value, sample_test_id: '' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    disabled={!!preselectedSampleId || !!resultId || isLoadingResult}
                  >
                    <option value="">Seleccionar muestra</option>
                    {loadingSamples ? (
                      <option disabled>Cargando muestras...</option>
                    ) : (
                      samples.map(sample => (
                        <option key={sample.id} value={sample.id}>
                          {sample.code} - {sample.clients?.name} ({sample.species})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Análisis *
                  </label>
                  <select
                    required
                    value={formData.sample_test_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, sample_test_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    disabled={!formData.sample_id}
                  >
                    <option value="">Seleccionar análisis</option>
                    {loadingTests ? (
                      <option disabled>Cargando análisis...</option>
                    ) : (
                      sampleTests.map(test => (
                        <option key={test.id} value={test.id}>
                          {test.test_catalog?.name} ({test.test_catalog?.area}) - {test.methods?.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Sample Info Display */}
                {selectedSample && (
                  <div className="sm:col-span-2 bg-blue-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                      <TestTube className="h-4 w-4 mr-2" />
                      Información del Solicitante
                    </h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Código:</span> {selectedSample.code}
                      </div>
                      <div>
                        <span className="text-gray-500">Cliente:</span> {selectedSample.clients?.name}
                      </div>
                      <div>
                        <span className="text-gray-500">RUT:</span> {selectedSample.clients?.rut}
                      </div>
                      <div>
                        <span className="text-gray-500">Email:</span> {selectedSample.clients?.contact_email}
                      </div>
                      <div>
                        <span className="text-gray-500">Especie:</span> {selectedSample.species}
                      </div>
                      <div>
                        <span className="text-gray-500">Fecha:</span> {new Date(selectedSample.received_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Result Information */}
                <div className="sm:col-span-2">
                  <h4 className="text-md font-medium text-gray-900 mb-4 mt-6">Información del Resultado</h4>
                  {selectedAnalysisArea && (
                    <div className="mb-4 p-2 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-700">
                        <span className="font-medium">Formato de resultado:</span> {selectedAnalysisArea}
                      </p>
                    </div>
                  )}
                </div>

                {/* Methodology Selection */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Metodología *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                    {METHOD_OPTIONS.map(methodology => (
                      <label key={methodology} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.methodologies.includes(methodology)}
                          onChange={(e) => handleMethodologyChange(methodology, e.target.checked)}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{methodology}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Identification Techniques */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Técnica de identificación *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {IDENTIFICATION_TECHNIQUE_OPTIONS.map(technique => (
                      <label key={technique} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.identification_techniques.includes(technique)}
                          onChange={(e) => handleIdentificationTechniqueChange(technique, e.target.checked)}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{technique}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {renderResultFormatFields()}

                {/* Text Areas */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diagnóstico
                  </label>
                  <textarea
                    rows={3}
                    value={formData.diagnosis}
                    onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Diagnóstico detallado del análisis..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conclusión
                  </label>
                  <textarea
                    rows={3}
                    value={formData.conclusion}
                    onChange={(e) => setFormData(prev => ({ ...prev, conclusion: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Conclusiones del análisis..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recomendaciones
                  </label>
                  <textarea
                    rows={3}
                    value={formData.recommendations}
                    onChange={(e) => setFormData(prev => ({ ...prev, recommendations: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Recomendaciones para el cliente..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hallazgos Técnicos (JSON)
                  </label>
                  <textarea
                    rows={4}
                    value={formData.findings}
                    onChange={(e) => setFormData(prev => ({ ...prev, findings: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                    placeholder='{"observaciones": "...", "mediciones": "...", "notas": "..."}'
                    readOnly={selectedAnalysisArea.toLowerCase().includes('nematolog') || selectedAnalysisArea.toLowerCase().includes('virolog') || selectedAnalysisArea.toLowerCase().includes('fitopatolog')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedAnalysisArea.toLowerCase().includes('nematolog') 
                      ? 'Generado automáticamente basado en los datos de nematología'
                      : selectedAnalysisArea.toLowerCase().includes('virolog')
                      ? 'Generado automáticamente basado en los datos de virología'
                      : selectedAnalysisArea.toLowerCase().includes('fitopatolog')
                      ? 'Generado automáticamente basado en los datos de fitopatología'
                      : 'Formato JSON opcional para datos estructurados'
                    }
                  </p>
                </div>
              </div>
            </div>
            )}
            
            <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {isSubmitting ? 'Creando...' : 'Crear Resultado'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
