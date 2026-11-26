'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures'
import { useSessionVertical } from '@/hooks/useSessionVertical'
import { isRouteAllowedForVertical } from '@/config/verticals'
import {
  Home,
  TestTube,
  Users,
  FileText,
  BarChart3,
  Settings,
  Menu,
  Bell,
  FlaskConical,
  Loader2,
  Microscope,
  CreditCard,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  Activity,
  ImageIcon,
  Layers,
  FileSpreadsheet,
  Building2,
  Eraser,
} from 'lucide-react'
import SidebarBrand from '@/components/branding/SidebarBrand'
import { useAppBranding } from '@/contexts/AppBrandingContext'
import { useCompanySidebarLogo } from '@/hooks/useCompanySidebarLogo'
import UserProfileDropdown from '@/components/UserProfileDropdown'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const PAGE_TITLES: Record<string, string> = {
  '/cliente': 'Panel',
  '/dashboard': 'Dashboard',
  '/samples': 'Muestras',
  '/results': 'Resultados',
  '/clients': 'Clientes',
  '/reports': 'Informes',
  '/suelo': 'Muestras',
  '/suelo/nueva': 'Nueva muestra',
  '/suelo/importar': 'Importar resultados',
  '/suelo/informes': 'Informes',
  '/suelo/informes/nuevo': 'Crear informe',
  '/estadisticas': 'Estadísticas',
  '/admin/companies': 'Compañías',
  '/admin/limpieza': 'Limpieza',
  '/admin/uso': 'Uso',
  '/admin/branding': 'Logos',
  '/settings': 'Configuración',
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const { authUser, isAuthenticated, isLoading, userRole } = useAuth()
  const brandingId = useAppBranding()
  const companyLogo = useCompanySidebarLogo(isAuthenticated, brandingId, isLoading)
  const { flags, isLoading: featuresLoading } = useCompanyFeatures(isAuthenticated)
  const { vertical: sessionVertical, isLoading: verticalLoading } = useSessionVertical(isAuthenticated)
  const pathname = usePathname()
  const isCsx = userRole === 'csx'

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !authUser)) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    }
  }, [isAuthenticated, authUser, isLoading])

  const navigation = useMemo(
    () => [
      { name: 'Panel', href: '/cliente', icon: BarChart3, roles: ['consumidor'] },
      { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'validador', 'comun', 'csx'] },
      { name: 'Muestras', href: '/samples', icon: TestTube, roles: ['admin', 'validador', 'comun'] },
      { name: 'Resultados', href: '/results', icon: FlaskConical, roles: ['admin', 'validador', 'comun'] },
      { name: 'Muestras', href: '/suelo', icon: TestTube, roles: ['admin', 'validador', 'comun'] },
      { name: 'Importar resultados', href: '/suelo/importar', icon: FileSpreadsheet, roles: ['admin', 'validador', 'comun'] },
      { name: 'Informes', href: '/suelo/informes', icon: FileText, roles: ['admin', 'validador', 'comun', 'consumidor'] },
      { name: 'Clientes', href: '/clients', icon: Users, roles: ['admin', 'validador', 'comun'] },
      { name: 'Informes', href: '/reports', icon: FileText, roles: ['admin', 'validador', 'comun', 'consumidor', 'csx'] },
      { name: 'Estadísticas', href: '/estadisticas', icon: BarChart3, roles: ['admin', 'validador'] },
      { name: 'Configuración', href: '/settings', icon: Settings, roles: ['admin'] },
      { name: 'Compañías', href: '/admin/companies', icon: Building2, roles: ['csx'] },
      { name: 'Limpieza', href: '/admin/limpieza', icon: Eraser, roles: ['csx'] },
      { name: 'Tipos de Análisis', href: '/admin/analysis-types', icon: Microscope, roles: ['csx'] },
      { name: 'Templates PDF', href: '/admin/company-templates', icon: FileText, roles: ['csx'] },
      { name: 'Metodologias', href: '/admin/methodology-options', icon: FlaskConical, roles: ['csx'] },
      { name: 'Analitos', href: '/admin/analytes', icon: TestTube, roles: ['csx'] },
      { name: 'Billing', href: '/admin/billing', icon: CreditCard, roles: ['csx'] },
      { name: 'Uso', href: '/admin/uso', icon: Activity, roles: ['csx'] },
      { name: 'Features', href: '/admin/features', icon: SlidersHorizontal, roles: ['csx'] },
      { name: 'Verticales', href: '/admin/verticals', icon: Layers, roles: ['csx'] },
      { name: 'Logos', href: '/admin/branding', icon: ImageIcon, roles: ['csx'] },
    ],
    []
  )

  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles.includes(userRole || 'consumidor')) return false
    if (!isCsx && !isRouteAllowedForVertical(item.href, sessionVertical)) return false
    if (
      userRole === 'consumidor' &&
      item.href === '/reports' &&
      (!flags.producer_portal || featuresLoading)
    ) {
      return false
    }
    return true
  })

  const pageTitle =
    PAGE_TITLES[pathname] ||
    filteredNavigation.find((item) => item.href === pathname)?.name ||
    'LIMS'

  const isConsumer = userRole === 'consumidor'
  const isRouteBlockedByVertical =
    !isCsx && !isRouteAllowedForVertical(pathname, sessionVertical)
  const sidebarWidthClass = desktopCollapsed ? 'lg:w-[4.5rem]' : 'lg:w-64'

  if (isLoading || !isAuthenticated || !authUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {isLoading ? 'Verificando autenticación...' : 'Redirigiendo...'}
          </p>
        </div>
      </div>
    )
  }

  const NavLinks = ({
    collapsed,
    onNavigate,
  }: {
    collapsed?: boolean
    onNavigate?: () => void
  }) => (
    <nav className={cn('flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-4', collapsed && 'px-1.5')}>
      {filteredNavigation.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.name}
            href={item.href}
            title={collapsed ? item.name : undefined}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              collapsed && 'justify-center px-2',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="truncate">{item.name}</span>}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex lg:flex-col',
          sidebarWidthClass
        )}
      >
        <div
          className={cn(
            'flex shrink-0 items-center border-b border-sidebar-border px-3',
            desktopCollapsed
              ? 'h-auto min-h-16 flex-col justify-center gap-1 py-3'
              : 'h-16 justify-between gap-2'
          )}
        >
          {desktopCollapsed ? (
            <SidebarBrand collapsed {...companyLogo} />
          ) : (
            <div className="min-w-0">
              <SidebarBrand {...companyLogo} />
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setDesktopCollapsed((prev) => !prev)}
            aria-label={desktopCollapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {desktopCollapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
        <NavLinks collapsed={desktopCollapsed} />
        {!desktopCollapsed && (
          <>
            <Separator />
            <div className="px-4 py-3 text-xs text-muted-foreground">
              {isConsumer ? 'Portal cliente' : 'Laboratorio'}
            </div>
          </>
        )}
      </aside>

      {/* Mobile nav */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-border px-4 py-4 text-left">
            <SheetTitle className="sr-only">Navegación</SheetTitle>
            <SidebarBrand {...companyLogo} />
          </SheetHeader>
          <NavLinks onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col transition-[padding] duration-200',
          desktopCollapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64'
        )}
      >
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-border bg-card/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground sm:text-base">
              {pageTitle}
            </p>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {isConsumer ? 'Vista cliente' : 'Operación de laboratorio'}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Button type="button" variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
            </Button>
            <UserProfileDropdown />
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {!isRouteBlockedByVertical ? (
            <>
              {!isCsx && !verticalLoading && sessionVertical.status === 'none' ? (
                <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 sm:px-6">
                  Tu laboratorio todavía no tiene una vertical asignada. Pide a soporte que la configure.
                </div>
              ) : null}
              {children}
            </>
          ) : verticalLoading ? (
            <div className="flex min-h-[50vh] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="mx-auto max-w-xl p-6">
              <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                {sessionVertical.status === 'none'
                  ? 'Tu laboratorio todavía no tiene una vertical asignada. Pide a soporte que la configure para habilitar el registro de muestras.'
                  : 'Esta sección no corresponde a la vertical de tu laboratorio.'}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
