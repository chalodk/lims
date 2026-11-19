'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Layers, Loader2, Save } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { VERTICAL_KEYS, VERTICAL_LABELS, type VerticalKey } from '@/config/verticals'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface CompanyVerticalRow {
  companyId: string
  companyName: string
  verticalKey: VerticalKey | null
}

export default function AdminVerticalsPage() {
  const router = useRouter()
  const { userRole, isAuthenticated, isLoading: authLoading } = useAuth()
  const [companies, setCompanies] = useState<CompanyVerticalRow[]>([])
  const [draftVerticals, setDraftVerticals] = useState<Record<string, VerticalKey | ''>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/verticals/companies')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar verticales')
      }
      const rows = (data.companies || []) as CompanyVerticalRow[]
      setCompanies(rows)
      setDraftVerticals(
        Object.fromEntries(rows.map((row) => [row.companyId, row.verticalKey ?? '']))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar verticales')
      setCompanies([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (userRole !== 'csx') {
      router.replace('/dashboard')
      return
    }
    void fetchCompanies()
  }, [authLoading, isAuthenticated, userRole, router, fetchCompanies])

  const handleSave = async (companyId: string) => {
    const verticalKey = draftVerticals[companyId]
    if (!verticalKey) return

    setSavingId(companyId)
    setSuccessMsg(null)
    setError(null)
    try {
      const response = await fetch(`/api/admin/verticals/companies/${companyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verticalKey }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar')
      }
      const updated = data.company as CompanyVerticalRow
      setCompanies((prev) =>
        prev.map((row) => (row.companyId === companyId ? updated : row))
      )
      setSuccessMsg(`Vertical asignada: ${updated.companyName}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingId(null)
    }
  }

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-green-100 p-2">
            <Layers className="h-6 w-6 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Verticales</h1>
            <p className="text-sm text-muted-foreground">
              Qué laboratorio opera cada compañía. Una compañía sin vertical no ve el registro de
              muestras.
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {successMsg ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMsg}
          </div>
        ) : null}

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-gray-100 py-3">
            <CardTitle className="text-base">Compañías</CardTitle>
            <CardDescription>
              {companies.length} compañía{companies.length === 1 ? '' : 's'}
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Compañía</TableHead>
                  <TableHead>Vertical</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((row) => {
                  const draftVertical = draftVerticals[row.companyId] ?? ''
                  const isUnchanged = draftVertical === (row.verticalKey ?? '')
                  return (
                    <TableRow key={row.companyId}>
                      <TableCell className="font-medium text-foreground">{row.companyName}</TableCell>
                      <TableCell>
                        <select
                          value={draftVertical}
                          onChange={(event) =>
                            setDraftVerticals((prev) => ({
                              ...prev,
                              [row.companyId]: event.target.value as VerticalKey | '',
                            }))
                          }
                          className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                          aria-label={`Vertical de ${row.companyName}`}
                        >
                          <option value="" disabled>
                            Sin asignar
                          </option>
                          {VERTICAL_KEYS.map((key) => (
                            <option key={key} value={key}>
                              {VERTICAL_LABELS[key]}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          onClick={() => void handleSave(row.companyId)}
                          disabled={savingId === row.companyId || !draftVertical || isUnchanged}
                          size="sm"
                          className="gap-1"
                        >
                          {savingId === row.companyId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          Guardar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {companies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      No hay compañías registradas
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
