import type { Metadata, Viewport } from 'next'
import { Inter, Geist } from 'next/font/google'
import { headers } from 'next/headers'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppBrandingProvider } from '@/contexts/AppBrandingContext'
import { resolveAppBrandingFromRequestHeaders } from '@/lib/branding/hostBranding'
import AuthDebug from '@/components/auth/AuthDebug'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const appBrandingId = resolveAppBrandingFromRequestHeaders(
    headersList.get('host'),
    headersList.get('x-forwarded-host')
  )

  return (
    <html lang="es" className={cn("font-sans", geist.variable)}>
      <body className={inter.className}>
        <AppBrandingProvider value={appBrandingId}>
          <AuthProvider>
            {children}
            <AuthDebug />
          </AuthProvider>
        </AppBrandingProvider>
      </body>
    </html>
  )
}