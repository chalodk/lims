'use client'

import { useEffect, useMemo, useState } from 'react'
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
  Bell,
  FlaskConical,
  Loader2,
  Microscope,
  CreditCard,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import AppBrandingLogo from '@/components/branding/AppBrandingLogo'
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
  '/estadisticas': 'Estadísticas',
  '/settings': 'Configuración',
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const { authUser, isAuthenticated, isLoading, userRole } = useAuth()
  const pathname = usePathname()

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
      { name: 'Clientes', href: '/clients', icon: Users, roles: ['admin', 'validador', 'comun'] },
      { name: 'Informes', href: '/reports', icon: FileText, roles: ['admin', 'validador', 'comun', 'consumidor', 'csx'] },
      { name: 'Estadísticas', href: '/estadisticas', icon: BarChart3, roles: ['admin', 'validador'] },
      { name: 'Configuración', href: '/settings', icon: Settings, roles: ['admin'] },
      { name: 'Tipos de Análisis', href: '/admin/analysis-types', icon: Microscope, roles: ['csx'] },
      { name: 'Templates PDF', href: '/admin/company-templates', icon: FileText, roles: ['csx'] },
      { name: 'Metodologias', href: '/admin/methodology-options', icon: FlaskConical, roles: ['csx'] },
      { name: 'Analitos', href: '/admin/analytes', icon: TestTube, roles: ['csx'] },
      { name: 'Billing', href: '/admin/billing', icon: CreditCard, roles: ['csx'] },
    ],
    []
  )

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(userRole || 'consumidor')
  )

  const pageTitle =
    PAGE_TITLES[pathname] ||
    filteredNavigation.find((item) => item.href === pathname)?.name ||
    'LIMS'

  const isConsumer = userRole === 'consumidor'
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
            'flex h-16 shrink-0 items-center border-b border-sidebar-border px-3',
            desktopCollapsed ? 'justify-center' : 'justify-between gap-2'
          )}
        >
          {!desktopCollapsed && (
            <div className="min-w-0">
              <AppBrandingLogo variant="sidebar" />
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
            <AppBrandingLogo variant="sidebar" />
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
          {children}
        </main>
      </div>
    </div>
  )
}
