'use client'

import { SampleWithClient } from '@/types/database'
import { X, TestTube, Calendar, User, FileText } from 'lucide-react'

interface ViewSampleModalProps {
  isOpen: boolean
  onClose: () => void
  sample: SampleWithClient
}

export default function ViewSampleModal({ isOpen, onClose, sample }: ViewSampleModalProps) {
  if (!isOpen) return null

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Parse requested_tests back to the three categories for display
  const parseRequestedTests = (tests: string[]) => {
    const analysisTypes: string[] = []
    const methodologies: string[] = []
    const identificationTechniques: string[] = []
    
    tests.forEach(test => {
      if (test.startsWith('Tipo: ')) {
        analysisTypes.push(test.replace('Tipo: ', ''))
      } else if (test.startsWith('Metodología: ')) {
        methodologies.push(test.replace('Metodología: ', ''))
      } else if (test.startsWith('Identificación: ')) {
        identificationTechniques.push(test.replace('Identificación: ', ''))
      }
    })
    
    return { analysisTypes, methodologies, identificationTechniques }
  }

  const parsedTests = parseRequestedTests(sample.requested_tests || [])

  const getStatusLabel = (status: string) => {
    const statusLabels = {
      received: 'Recibida',
      processing: 'Procesando',
      microscopy: 'Microscopía',
      isolation: 'Aislamiento',
      identification: 'Identificación',
      molecular_analysis: 'Análisis Molecular',
      validation: 'Validación',
      completed: 'Completada'
    }
    return statusLabels[status as keyof typeof statusLabels] || status
  }

  const getPriorityLabel = (priority: string) => {
    const priorityLabels = {
      normal: 'Normal',
      express: 'Express',
      urgent: 'Urgente'
    }
    return priorityLabels[priority as keyof typeof priorityLabels] || priority
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                  <TestTube className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Detalles de la Muestra
                  </h3>
                  <p className="text-sm text-gray-500">
                    Código: {sample.code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Basic Information */}
              <div className="sm:col-span-2 lg:col-span-3">
                <h4 className="text-md font-medium text-gray-900 mb-4">Información básica</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <p className="text-sm text-gray-900">{sample.code}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <p className="text-sm text-gray-900">{getStatusLabel(sample.status)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                <p className="text-sm text-gray-900">{getPriorityLabel(sample.priority)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto</label>
                <p className="text-sm text-gray-900">{sample.project || 'No especificado'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Especie</label>
                <p className="text-sm text-gray-900">{sample.species}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Variedad</label>
                <p className="text-sm text-gray-900">{sample.variety || 'No especificada'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de recepción</label>
                <p className="text-sm text-gray-900">{formatDate(sample.received_date)}</p>
              </div>

              {/* Agricultural Information */}
              <div className="sm:col-span-2 lg:col-span-3">
                <h4 className="text-md font-medium text-gray-900 mb-4 mt-6">Información agrícola</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Año de plantación</label>
                <p className="text-sm text-gray-900">{sample.planting_year || 'No especificado'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cultivo anterior</label>
                <p className="text-sm text-gray-900">{sample.previous_crop || 'No especificado'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Próximo cultivo</label>
                <p className="text-sm text-gray-900">{sample.next_crop || 'No especificado'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Terreno en barbecho</label>
                <p className="text-sm text-gray-900">{sample.fallow ? 'Sí' : 'No'}</p>
              </div>

              {/* Delivery Information */}
              <div className="sm:col-span-2 lg:col-span-3">
                <h4 className="text-md font-medium text-gray-900 mb-4 mt-6">Información de entrega</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recolectada por</label>
                <p className="text-sm text-gray-900">{sample.taken_by === 'client' ? 'Cliente' : 'Laboratorio'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de entrega</label>
                <p className="text-sm text-gray-900">{sample.delivery_method || 'No especificado'}</p>
              </div>

              {/* Analysis Information */}
              <div className="sm:col-span-2 lg:col-span-3">
                <h4 className="text-md font-medium text-gray-900 mb-4 mt-6">Información del análisis</h4>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Patógeno sospechoso</label>
                <p className="text-sm text-gray-900">{sample.suspected_pathogen || 'No especificado'}</p>
              </div>

              {/* Analysis Types */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de análisis</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {parsedTests.analysisTypes.length > 0 ? parsedTests.analysisTypes.map(type => (
                    <span key={type} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {type}
                    </span>
                  )) : (
                    <span className="text-sm text-gray-500">No especificado</span>
                  )}
                </div>
              </div>

              {/* Methodologies */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Metodología</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {parsedTests.methodologies.length > 0 ? parsedTests.methodologies.map(methodology => (
                    <span key={methodology} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {methodology}
                    </span>
                  )) : (
                    <span className="text-sm text-gray-500">No especificado</span>
                  )}
                </div>
              </div>

              {/* Identification Techniques */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Técnica de identificación</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {parsedTests.identificationTechniques.length > 0 ? parsedTests.identificationTechniques.map(technique => (
                    <span key={technique} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {technique}
                    </span>
                  )) : (
                    <span className="text-sm text-gray-500">No especificado</span>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="sm:col-span-2 lg:col-span-3">
                <h4 className="text-md font-medium text-gray-900 mb-4 mt-6">Notas y observaciones</h4>
              </div>

              <div className="sm:col-span-1 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas del cliente</label>
                <p className="text-sm text-gray-900">{sample.client_notes || 'Sin notas'}</p>
              </div>

              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas de recepción</label>
                <p className="text-sm text-gray-900">{sample.reception_notes || 'Sin notas'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}