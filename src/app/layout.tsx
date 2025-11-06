import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import AuthDebug from '@/components/auth/AuthDebug'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LIMS - Sistema de Gestión de Laboratorio',
  description: 'Sistema integral de gestión para laboratorios de análisis fitopatológico',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <AuthDebug />
        </AuthProvider>
      </body>
    </html>
  )
}