'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { 
  Home,
  TestTube,
  Users,
  FileText,
  BarChart3,
  Settings,
  Menu,
  X,
  Bell,
  FlaskConical
} from 'lucide-react'
import Image from 'next/image'
import UserProfileDropdown from '@/components/UserProfileDropdown'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { userRole } = useAuth()
  const pathname = usePathname()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'validador', 'comun'] },
    { name: 'Muestras', href: '/samples', icon: TestTube, roles: ['admin', 'validador', 'comun'] },
    { name: 'Resultados', href: '/results', icon: FlaskConical, roles: ['admin', 'validador', 'comun'] },
    { name: 'Clientes', href: '/clients', icon: Users, roles: ['admin', 'validador', 'comun'] },
    { name: 'Informes', href: '/reports', icon: FileText, roles: ['admin', 'validador', 'comun', 'consumidor'] },
    { name: 'Estadísticas', href: '/estadisticas', icon: BarChart3, roles: ['admin', 'validador'] },
    { name: 'Configuración', href: '/settings', icon: Settings, roles: ['admin'] },
  ]

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userRole || 'consumidor')
  )

  return (
    <div className="min-h-screen bg-gray-50 flex w-full overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 shrink-0">
            <div className="flex items-center space-x-3">
              <Image
                src={
                  'https://mknzstzwhbfoyxzfudfw.supabase.co/storage/v1/object/public/images/ORG_logo_NEMACHILE_(R)_01.08.23.ai.png'
                }
                alt="Logo"
                width={140}
                height={42}
                className="w-[140px] h-auto max-w-full"
                priority
              />
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Spacer for fixed sidebar on desktop */}
      <div className="hidden lg:block w-64 flex-shrink-0" />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 w-full lg:ml-0">
        {/* Top header - Fixed */}
        <header className="fixed top-0 right-0 left-0 lg:left-64 z-40 bg-white shadow-sm border-b border-gray-200 h-16">
          <div className="flex items-center justify-end h-full px-2 sm:px-4 md:px-6 w-full">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden absolute left-2 sm:left-4 p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              {/* Notifications */}
              <button className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              
              {/* Company info */}
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium text-gray-900">
                  Laboratorio
                </p>
                <p className="text-xs text-gray-500">
                  Sistema LIMS
                </p>
              </div>

              {/* User Profile Dropdown */}
              <UserProfileDropdown />
            </div>
          </div>
        </header>

        {/* Spacer for fixed header */}
        <div className="h-16 shrink-0" />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full">
          <div className="w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}