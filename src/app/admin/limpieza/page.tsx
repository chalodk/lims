'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Eraser, FileText, FlaskConical, Loader2, TestTube } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { fieldClassName } from '@/components/ui/form-field-styles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type SoilCompany = {
  id: string
  name: string
}

type SoilOperationalCounts = {
  soilSamples: number
  soilResults: number
  soilReports: number
}

const EMPTY_COUNTS: SoilOperationalCounts = {
  soilSamples: 0,
  soilResults: 0,
  soilReports: 0,
}

function readCounts(value: unknown): SoilOperationalCounts | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (
    typeof row.soilSamples !== 'number' ||
    typeof row.soilResults !== 'number' ||
    typeof row.soilReports !== 'number'
  ) {
    return null
  }
  return {
    soilSamples: row.soilSamples,
    soilResults: row.soilResults,
    soilReports: row.soilReports,
  }
}

export default function AdminLimpiezaPage() {
  const router = useRouter()
  const { userRole, isAuthenticated, isLoading: authLoading } = useAuth()
  const [companies, setCompanies] = useState<SoilCompany[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [counts, setCounts] = useState<SoilOperationalCounts | null>(null)
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true)
  const [isLoadingCounts, setIsLoadingCounts] = useState(false)
  const [isPurging, setIsPurging] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [listError, setListError] = useState<string | null>(null)
  const [countsError, setCountsError] = useState<string | null>(null)
  const [purgeError, setPurgeError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [storageWarning, setStorageWarning] = useState<string | null>(null)
  const [failedStoragePaths, setFailedStoragePaths] = useState<string[]>([])

  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true)
    setListError(null)
    try {
      const response = await fetch('/api/admin/verticals/companies')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar laboratorios')
      }
      const rows = (data.companies || []) as Array<{
        companyId?: string
        companyName?: string
        verticalKey?: string | null
      }>
      setCompanies(
        rows
          .filter((row) => row.verticalKey === 'suelo' && row.companyId && row.companyName)
          .map((row) => ({ id: row.companyId as string, name: row.companyName as string }))
      )
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'Error al cargar laboratorios')
      setCompanies([])
    } finally {
      setIsLoadingCompanies(false)
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

  useEffect(() => {
    if (!selectedCompanyId) {
      setCounts(null)
      setCountsError(null)
      setIsLoadingCounts(false)
      return
    }

    let cancelled = false
    setIsLoadingCounts(true)
    setCounts(null)
    setCountsError(null)
    setSuccessMessage(null)
    setStorageWarning(null)
    setFailedStoragePaths([])

    void (async () => {
      try {
        const response = await fetch(`/api/admin/companies/${selectedCompanyId}/operational-data`)
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'No se pudieron cargar los conteos')
        }
        const nextCounts = readCounts(data.counts)
        if (!nextCounts) {
          throw new Error('No se pudieron cargar los conteos')
        }
        if (!cancelled) setCounts(nextCounts)
      } catch (error) {
        if (!cancelled) {
          setCounts(null)
          setCountsError(error instanceof Error ? error.message : 'No se pudieron cargar los conteos')
        }
      } finally {
        if (!cancelled) setIsLoadingCounts(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedCompanyId])

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) ?? null
  const nameMatches = selectedCompany !== null && confirmName.trim() === selectedCompany.name

  const openConfirm = () => {
    setPurgeError(null)
    setConfirmName('')
    setConfirmOpen(true)
  }

  const handlePurge = async () => {
    if (!selectedCompany || !nameMatches) return
    setIsPurging(true)
    setPurgeError(null)
    try {
      const response = await fetch(`/api/admin/companies/${selectedCompany.id}/purge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmName: confirmName.trim() }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo limpiar el laboratorio')
      }
      const purgedCounts = readCounts(data.counts) ?? EMPTY_COUNTS
      setSuccessMessage(
        `Se limpió ${selectedCompany.name}: ${purgedCounts.soilSamples} muestras, ${purgedCounts.soilResults} resultados y ${purgedCounts.soilReports} informes de suelo.`
      )
      const nextFailedPaths = Array.isArray(data.failedStoragePaths)
        ? data.failedStoragePaths.filter((path: unknown): path is string => typeof path === 'string' && path.length > 0)
        : []
      setStorageWarning(typeof data.storageWarning === 'string' ? data.storageWarning : null)
      setFailedStoragePaths(nextFailedPaths)
      setConfirmOpen(false)
      setConfirmName('')
      setCounts(EMPTY_COUNTS)
    } catch (error) {
      setPurgeError(error instanceof Error ? error.message : 'No se pudo limpiar el laboratorio')
    } finally {
      setIsPurging(false)
    }
  }

  if (authLoading || !isAuthenticated || userRole !== 'csx') {
    return (
      <DashboardLayout>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-green-100 p-2">
            <Eraser className="h-6 w-6 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Limpieza</h1>
            <p className="text-sm text-muted-foreground">
              Borra muestras, resultados e informes de un laboratorio de suelo para volver a cargarlos.
              No modifica usuarios, clientes, catálogos ni la data de plagas.
            </p>
          </div>
        </div>

        {listError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {listError}
          </div>
        ) : null}
        {successMessage ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700" role="status">
            {successMessage}
          </div>
        ) : null}
        {storageWarning ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
            <p>{storageWarning}</p>
            {failedStoragePaths.length > 0 ? (
              <ul className="mt-2 list-disc pl-5">
                {failedStoragePaths.map((path) => (
                  <li key={path}>{path}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <Card>
          <CardHeader className="border-b border-gray-100 py-3">
            <CardTitle className="text-base">Laboratorio de suelo</CardTitle>
            <CardDescription>
              Elige una compañía. Los laboratorios de plagas no aparecen en esta lista.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="soil-company">Compañía</Label>
              <select
                id="soil-company"
                className={fieldClassName}
                value={selectedCompanyId}
                disabled={isLoadingCompanies || isPurging}
                onChange={(event) => {
                  setSelectedCompanyId(event.target.value)
                  setConfirmOpen(false)
                  setConfirmName('')
                  setPurgeError(null)
                }}
              >
                <option value="">Selecciona un laboratorio</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>

            {isLoadingCompanies ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando laboratorios
              </p>
            ) : null}
            {!isLoadingCompanies && companies.length === 0 && !listError ? (
              <p className="text-sm text-muted-foreground">No hay laboratorios de suelo.</p>
            ) : null}

            {selectedCompany ? (
              <div className="space-y-3">
                {isLoadingCounts ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Contando data de suelo
                  </p>
                ) : null}
                {countsError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                    {countsError}
                  </div>
                ) : null}
                {counts ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <CountCard label="Muestras" value={counts.soilSamples} icon={TestTube} />
                    <CountCard label="Resultados" value={counts.soilResults} icon={FlaskConical} />
                    <CountCard label="Informes" value={counts.soilReports} icon={FileText} />
                  </div>
                ) : null}
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!counts || isLoadingCounts || isPurging}
                  onClick={openConfirm}
                >
                  Limpiar datos
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Dialog
          open={confirmOpen}
          onOpenChange={(open) => {
            if (!open && !isPurging) {
              setConfirmOpen(false)
              setPurgeError(null)
            }
          }}
        >
          <DialogContent
            showCloseButton={!isPurging}
            className="sm:max-w-lg"
            onInteractOutside={(event) => {
              if (isPurging) event.preventDefault()
            }}
            onEscapeKeyDown={(event) => {
              if (isPurging) event.preventDefault()
            }}
          >
            <DialogHeader className="border-b border-gray-100 bg-white">
              <div className="flex items-start gap-3 pr-8">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <DialogTitle>Confirmar limpieza</DialogTitle>
                  <DialogDescription className="mt-1">Esta acción no se puede deshacer</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 px-6 py-5">
              <p className="text-sm text-gray-900">
                ¿Estás seguro de limpiar la data de suelo de <strong>{selectedCompany?.name}</strong>?
              </p>
              <p className="text-sm text-gray-600">
                Se borran {counts?.soilSamples ?? 0} muestras, {counts?.soilResults ?? 0} resultados y{' '}
                {counts?.soilReports ?? 0} informes de suelo, junto con las planillas importadas. Usuarios,
                clientes y la data de plagas se conservan.
              </p>
              {purgeError ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {purgeError}
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="confirm-company-name">Escribe {selectedCompany?.name} para confirmar</Label>
                <Input
                  id="confirm-company-name"
                  value={confirmName}
                  onChange={(event) => setConfirmName(event.target.value)}
                  autoComplete="off"
                  disabled={isPurging}
                  placeholder={selectedCompany?.name ?? ''}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isPurging}
                onClick={() => {
                  setConfirmOpen(false)
                  setPurgeError(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!nameMatches || isPurging}
                onClick={() => void handlePurge()}
                className="gap-2"
              >
                {isPurging ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Limpiando...
                  </>
                ) : (
                  'Limpiar'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

function CountCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: number
  icon: typeof TestTube
}) {
  return (
    <div className="rounded-lg border border-gray-200 px-3 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  )
}
