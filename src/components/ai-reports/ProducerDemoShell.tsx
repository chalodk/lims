'use client'

import type { ReactNode } from 'react'
import { BarChart3, FileText, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ProducerDemoSection = 'panel' | 'informes'

type ProducerDemoShellProps = {
  activeSection: ProducerDemoSection
  onSectionChange: (section: ProducerDemoSection) => void
  children: ReactNode
  headerAction?: ReactNode
}

const NAV_ITEMS: Array<{
  id: ProducerDemoSection
  name: string
  icon: typeof BarChart3
}> = [
  { id: 'panel', name: 'Panel', icon: BarChart3 },
  { id: 'informes', name: 'Informes', icon: FileText },
]

export default function ProducerDemoShell({
  activeSection,
  onSectionChange,
  children,
  headerAction,
}: ProducerDemoShellProps) {
  const title = activeSection === 'panel' ? 'Panel' : 'Informes'

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-gray-100 px-5">
          <FlaskConical className="h-7 w-7 text-green-700" />
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight text-foreground">LIMS</p>
            <p className="text-[11px] text-muted-foreground">Vista productor</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-green-100 text-green-800'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.name}
              </button>
            )
          })}
        </nav>
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="text-xs text-muted-foreground">Demo · productor agrícola</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground lg:hidden">Panel · Informes</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden gap-1 sm:flex lg:hidden">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSectionChange(item.id)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium',
                    activeSection === item.id
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  )}
                >
                  {item.name}
                </button>
              ))}
            </div>
            {headerAction}
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
