'use client'

import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function FormSection({
  step,
  title,
  description,
  children,
  className,
}: {
  step?: number | string
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-xl border border-gray-100 bg-gray-50/60 p-4 sm:p-5',
        className
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        {step !== undefined ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700">
            {step}
          </span>
        ) : null}
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  )
}

export function Field({
  label,
  required,
  children,
  className,
}: {
  label: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-sm font-medium text-gray-700">
        {label}
        {required ? <span className="text-green-700"> *</span> : null}
      </Label>
      {children}
    </div>
  )
}

export function ReadOnlyField({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm text-foreground">{value ?? '—'}</div>
    </div>
  )
}
