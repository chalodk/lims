'use client'

import { useState } from 'react'
import { TestTube, X } from 'lucide-react'

interface Sample {
  code: string
  species: string
  variety?: string
}

interface SamplesDisplayProps {
  samples: Sample[]
}

export default function SamplesDisplay({ samples }: SamplesDisplayProps) {
  const [showModal, setShowModal] = useState(false)

  if (!samples || samples.length === 0) {
    return <span className="text-sm text-gray-500">Sin muestras</span>
  }

  if (samples.length === 1) {
    return (
      <div className="flex items-center">
        <TestTube className="h-4 w-4 text-gray-400 mr-2" />
        <span className="text-sm text-gray-900">
          {samples[0].code}
          {samples[0].species && (
            <span className="text-gray-500 ml-1">({samples[0].species})</span>
          )}
        </span>
      </div>
    )
  }

  return (
    <>
      <div 
        className="flex items-center cursor-pointer hover:bg-gray-100 p-1 rounded"
        onClick={() => setShowModal(true)}
      >
        <TestTube className="h-4 w-4 text-gray-400 mr-2" />
        <span className="text-sm text-gray-900">
          {samples[0].code}
          <span className="text-blue-600 font-medium ml-1">+{samples.length - 1}</span>
        </span>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium text-gray-900">
                Muestras del Informe ({samples.length})
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {samples.map((sample, index) => (
                  <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                    <TestTube className="h-4 w-4 text-gray-400 mr-3" />
                    <div>
                      <div className="font-medium text-gray-900">{sample.code}</div>
                      {sample.species && (
                        <div className="text-sm text-gray-500">
                          {sample.species}
                          {sample.variety && ` - ${sample.variety}`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end p-4 border-t">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
