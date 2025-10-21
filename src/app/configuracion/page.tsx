'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Database,
  Mail,
  Key,
  Globe
} from 'lucide-react'

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState('profile')

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'system', label: 'Sistema', icon: Database }
  ]

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración</h1>
          <p className="text-gray-600">Gestiona la configuración de tu cuenta y del sistema</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border">
              {activeTab === 'profile' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Información del Perfil</h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre completo
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="Tu nombre completo"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                          placeholder="tu@email.com"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Empresa
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Nombre de tu empresa"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                        Guardar Cambios
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Configuración de Notificaciones</h2>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Notificaciones por email</h3>
                        <p className="text-sm text-gray-500">Recibe notificaciones importantes por correo</p>
                      </div>
                      <input type="checkbox" className="h-4 w-4 text-green-600" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Nuevos resultados</h3>
                        <p className="text-sm text-gray-500">Notificaciones cuando se completen análisis</p>
                      </div>
                      <input type="checkbox" className="h-4 w-4 text-green-600" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Recordatorios de SLA</h3>
                        <p className="text-sm text-gray-500">Alertas cuando se acerque el plazo de entrega</p>
                      </div>
                      <input type="checkbox" className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Configuración de Seguridad</h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Cambiar contraseña</h3>
                      <div className="space-y-4">
                        <input
                          type="password"
                          placeholder="Contraseña actual"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <input
                          type="password"
                          placeholder="Nueva contraseña"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <input
                          type="password"
                          placeholder="Confirmar nueva contraseña"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                          Cambiar Contraseña
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'system' && (
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Configuración del Sistema</h2>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Zona horaria
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                          <option>UTC-5 (Colombia)</option>
                          <option>UTC-6 (México)</option>
                          <option>UTC-3 (Argentina)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Idioma
                        </label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                          <option>Español</option>
                          <option>English</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Formato de fecha
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500">
                        <option>DD/MM/YYYY</option>
                        <option>MM/DD/YYYY</option>
                        <option>YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
