'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import { 
  TestCatalog, 
  Method,
  Sample
} from '@/types/database'

interface SampleUnit {
  id: string
  sample_id: string
  unit_number: number
  weight?: number
  volume?: number
  description?: string
  label?: string
  code?: string
  unit_results?: UnitResult[]
}

interface UnitResult {
  id: string
  sample_unit_id: string
  test_id: number
  result_value?: string
  result_status?: string
  notes?: string
  methods?: Method
}

interface SampleTest {
  test_id: number
  method_id?: number
  test_catalog?: TestCatalog
  methods?: Method
}

interface SampleWithUnits extends Sample {
  sample_units: SampleUnit[]
  sample_tests: SampleTest[]
}

import { 
  Save, 
  AlertCircle 
} from 'lucide-react'

interface ResultsEntryProps {
  sampleId: string
  onSave?: () => void
}

interface ResultEntry {
  id?: string
  sample_unit_id: string
  test_id: number
  method_id?: number
  analyte?: string
  result_value?: number
  result_flag?: 'positivo' | 'negativo' | 'na'
  result_status?: string
  notes?: string
  test_catalog?: TestCatalog
  methods?: Method
}

export function ResultsEntry({ sampleId, onSave }: ResultsEntryProps) {
  const [sample, setSample] = useState<SampleWithUnits | null>(null)
  const [results, setResults] = useState<ResultEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = getSupabaseClient()

  const fetchSampleData = useCallback(async () => {
    try {
      const { data: sampleData, error: sampleError } = await supabase
        .from('samples')
        .select(`
          *,
          sample_tests (
            *,
            test_catalog (*),
            methods (*)
          ),
          sample_units (
            *,
            unit_results (
              *,
              test_catalog (*),
              methods (*)
            )
          )
        `)
        .eq('id', sampleId)
        .single()

      if (sampleError) throw sampleError

      setSample(sampleData as SampleWithUnits)
      
      // Initialize results structure
      const resultEntries: ResultEntry[] = []
      
      if (sampleData.sample_units && sampleData.sample_tests) {
        sampleData.sample_units.forEach((unit: SampleUnit) => {
          sampleData.sample_tests.forEach((sampleTest: SampleTest) => {
            // Check if result already exists
            const existingResult = unit.unit_results?.find(
              (result: UnitResult) => result.test_id === sampleTest.test_id
            )

            if (existingResult) {
              resultEntries.push({
                id: existingResult.id,
                sample_unit_id: existingResult.sample_unit_id,
                test_id: existingResult.test_id,
                result_value: existingResult.result_value ? Number(existingResult.result_value) : undefined,
                result_status: existingResult.result_status,
                result_flag: 'na',
                notes: existingResult.notes,
                test_catalog: sampleTest.test_catalog,
                methods: existingResult.methods || sampleTest.methods
              })
            } else {
              // Create empty result entry
              resultEntries.push({
                sample_unit_id: unit.id,
                test_id: sampleTest.test_id,
                method_id: sampleTest.method_id,
                result_flag: 'na',
                test_catalog: sampleTest.test_catalog,
                methods: sampleTest.methods
              })
            }
          })
        })
      }

      setResults(resultEntries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading sample data')
    } finally {
      setLoading(false)
    }
  }, [supabase, sampleId])

  useEffect(() => {
    if (sampleId) {
      fetchSampleData()
    }
  }, [sampleId, fetchSampleData])

  const updateResult = (index: number, field: keyof ResultEntry, value: string | number | undefined | null) => {
    setResults(prev => prev.map((result, i) => 
      i === index ? { ...result, [field]: value } : result
    ))
  }

  const saveResults = async () => {
    setSaving(true)
    setError(null)

    try {
      const resultsToSave = results.filter(result => 
        result.result_value !== null || 
        result.result_flag !== 'na' || 
        result.notes?.trim()
      )

      for (const result of resultsToSave) {
        const resultData = {
          sample_unit_id: result.sample_unit_id,
          test_id: result.test_id,
          method_id: result.method_id,
          analyte: result.analyte,
          result_value: result.result_value,
          result_flag: result.result_flag,
          notes: result.notes
        }

        if (result.id) {
          // Update existing result
          const { error } = await supabase
            .from('unit_results')
            .update(resultData)
            .eq('id', result.id)

          if (error) throw error
        } else {
          // Insert new result
          const { error } = await supabase
            .from('unit_results')
            .insert(resultData)

          if (error) throw error
        }
      }

      onSave?.()
      await fetchSampleData() // Refresh data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving results')
    } finally {
      setSaving(false)
    }
  }

  const getResultWidget = (result: ResultEntry, index: number) => {
    const testArea = result.test_catalog?.area

    switch (testArea) {
      case 'virologia':
        return (
          <div className="space-y-2">
            <select
              value={result.result_flag || 'na'}
              onChange={(e) => updateResult(index, 'result_flag', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="na">Sin resultado</option>
              <option value="positivo">Positivo</option>
              <option value="negativo">Negativo</option>
            </select>
          </div>
        )

      case 'nematologia':
        return (
          <div className="space-y-2">
            <input
              type="number"
              value={result.result_value || ''}
              onChange={(e) => updateResult(index, 'result_value', e.target.value ? Number(e.target.value) : null)}
              placeholder="Conteo"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={result.analyte || ''}
              onChange={(e) => updateResult(index, 'analyte', e.target.value)}
              placeholder="Especie de nematodo"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )

      case 'fitopatologia':
        return (
          <div className="space-y-2">
            <input
              type="number"
              value={result.result_value || ''}
              onChange={(e) => updateResult(index, 'result_value', e.target.value ? Number(e.target.value) : null)}
              placeholder="Conteo/Dilución"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={result.analyte || ''}
              onChange={(e) => updateResult(index, 'analyte', e.target.value)}
              placeholder="Hongo identificado"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={result.result_flag || 'na'}
              onChange={(e) => updateResult(index, 'result_flag', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="na">Sin resultado</option>
              <option value="positivo">Presente</option>
              <option value="negativo">Ausente</option>
            </select>
          </div>
        )

      default:
        return (
          <div className="space-y-2">
            <input
              type="text"
              value={result.analyte || ''}
              onChange={(e) => updateResult(index, 'analyte', e.target.value)}
              placeholder="Analito"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              value={result.result_value || ''}
              onChange={(e) => updateResult(index, 'result_value', e.target.value ? Number(e.target.value) : null)}
              placeholder="Valor"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando datos de muestra...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
          <p className="text-red-700">Error: {error}</p>
        </div>
      </div>
    )
  }

  if (!sample || !sample.sample_units || sample.sample_units.length === 0) {
    return (
      <div className="text-center p-6 text-gray-500">
        <p>No hay unidades de muestra configuradas.</p>
      </div>
    )
  }

  const units = sample.sample_units || []
  const sampleTests = sample.sample_tests || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Ingreso de Resultados - {sample.code}
        </h3>
        <button
          onClick={saveResults}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? 'Guardando...' : 'Guardar Resultados'}
        </button>
      </div>

      {sampleTests.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <p className="text-yellow-700">No hay tests asignados a esta muestra.</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unidad
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Test
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Método
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resultado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notas
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.map((result, index) => {
              const unit = units.find(u => u.id === result.sample_unit_id)
              
              return (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {unit?.label || unit?.code || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {result.test_catalog?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {result.test_catalog?.area}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.methods?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    {getResultWidget(result, index)}
                  </td>
                  <td className="px-6 py-4">
                    <textarea
                      value={result.notes || ''}
                      onChange={(e) => updateResult(index, 'notes', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Observaciones..."
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {results.length === 0 && (
        <div className="text-center p-6 text-gray-500">
          <p>No hay combinaciones de test-unidad disponibles.</p>
        </div>
      )}
    </div>
  )
}