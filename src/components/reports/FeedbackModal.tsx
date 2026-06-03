'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import { X, MessageCircle, Mail, Loader2 } from 'lucide-react'

const REQUIREMENT_OPTIONS = [
  { value: 'soporte', label: 'Soporte' },
  { value: 'consultas', label: 'Consultas' },
  { value: 'saber_mas', label: 'Saber más de Agroanalytics' },
]

const WHATSAPP_NUMBER = '56997023645'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user } = useAuth()
  const [companyName, setCompanyName] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    requirement: 'soporte',
    analysisType: '',
    message: '',
  })

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        requirement: 'soporte',
        analysisType: '',
        message: '',
      })
      setSent(false)
    }
  }, [isOpen, user])

  useEffect(() => {
    if (isOpen && user?.company_id) {
      const supabase = getSupabaseClient()
      supabase
        .from('companies')
        .select('name')
        .eq('id', user.company_id)
        .single()
        .then(({ data }) => {
          if (data) setCompanyName(data.name)
        })
    }
  }, [isOpen, user?.company_id])

  const handleSend = async () => {
    setIsSending(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          companyName,
          userId: user?.id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al enviar')
      }

      setSent(true)
    } catch (error) {
      console.error('Error sending feedback:', error)
      alert('Error al enviar el feedback. Intenta nuevamente.')
    } finally {
      setIsSending(false)
    }
  }

  const handleWhatsApp = () => {
    const requestLabel = REQUIREMENT_OPTIONS.find(o => o.value === formData.requirement)?.label || formData.requirement
    const text = [
      `Hola Agroanalytics, soy ${formData.name || user?.name || '(sin nombre)'}, usuario de LIMS ${companyName || 'mi empresa'} y necesito ${requestLabel.toLowerCase()}.`,
      formData.analysisType ? `\n*Tipo de análisis:* ${formData.analysisType}` : '',
      formData.message ? `\n*Mensaje:* ${formData.message}` : '',
    ]
      .filter(Boolean)
      .join('')

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                  <MessageCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Enviar feedback</h3>
                  <p className="text-sm text-gray-500">Déjanos tu consulta o sugerencia</p>
                </div>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="feedback-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  id="feedback-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <label htmlFor="feedback-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  id="feedback-email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="tu@correo.com"
                />
              </div>

              <div>
                <label htmlFor="feedback-requirement" className="block text-sm font-medium text-gray-700 mb-1">
                  Requerimiento
                </label>
                <select
                  id="feedback-requirement"
                  value={formData.requirement}
                  onChange={(e) => setFormData(prev => ({ ...prev, requirement: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  {REQUIREMENT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="feedback-analysis-type" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de análisis <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  id="feedback-analysis-type"
                  value={formData.analysisType}
                  onChange={(e) => setFormData(prev => ({ ...prev, analysisType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Ej: Análisis foliar, nematodos..."
                />
              </div>

              <div>
                <label htmlFor="feedback-message" className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje
                </label>
                <textarea
                  id="feedback-message"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Escribe tu consulta o sugerencia aquí..."
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-4 sm:px-6 flex justify-between">
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending || sent}
              className="inline-flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Mail className="h-5 w-5" />
              )}
              <span>{sent ? 'Enviado' : 'Enviar'}</span>
            </button>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="inline-flex items-center space-x-2 px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
