import type { Metadata, Viewport } from 'next'
import { Inter, Geist } from 'next/font/google'
import { headers } from 'next/headers'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { AppBrandingProvider } from '@/contexts/AppBrandingContext'
import {
  LIMS_FAVICON_URL,
  getRequestOrigin,
  getSocialPreviewImage,
  resolveAppBrandingFromRequestHeaders,
} from '@/lib/branding/hostBranding'
import AuthDebug from '@/components/auth/AuthDebug'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ['latin'] })

const DEFAULT_TITLE = 'LIMS - Sistema de Gestión de Laboratorio'
const DEFAULT_DESCRIPTION =
  'Sistema integral de gestión para laboratorios de análisis fitopatológico'

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const brandingId = resolveAppBrandingFromRequestHeaders(
    headersList.get('host'),
    headersList.get('x-forwarded-host')
  )
  const origin = getRequestOrigin(
    headersList.get('host'),
    headersList.get('x-forwarded-host'),
    headersList.get('x-forwarded-proto')
  )
  const shareImage = getSocialPreviewImage(brandingId)

  return {
    metadataBase: new URL(origin),
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    icons: {
      icon: [{ url: LIMS_FAVICON_URL, type: 'image/svg+xml' }],
      shortcut: LIMS_FAVICON_URL,
      apple: brandingId === 'generic' ? shareImage.url : '/branding/lims-isotype.png',
    },
    openGraph: {
      type: 'website',
      locale: 'es_CL',
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      images: [shareImage],
    },
    twitter: {
      card: 'summary',
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      images: [shareImage.url],
    },
  }
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