'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'
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

interface CompanyBrandingRow {
  companyId: string
  companyName: string
  logoUrl: string | null
}

export default function AdminBrandingPage() {
  const router = useRouter()
  const { userRole, isAuthenticated, isLoading: authLoading } = useAuth()
  const [companies, setCompanies] = useState<CompanyBrandingRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({})
  const [fileInputVersion, setFileInputVersion] = useState<Record<string, number>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/branding/companies')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar logos')
      }
      setCompanies((data.companies || []) as CompanyBrandingRow[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar logos')
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

  const applyUpdatedCompany = (updated: CompanyBrandingRow) => {
    setCompanies((prev) =>
      prev.map((row) => (row.companyId === updated.companyId ? updated : row))
    )
  }

  const handleUpload = async (companyId: string) => {
    const file = selectedFiles[companyId]
    if (!file) {
      setError('Elige un archivo antes de subir')
      return
    }

    setSavingId(companyId)
    setSuccessMsg(null)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('logo', file)
      const response = await fetch(`/api/admin/branding/companies/${companyId}`, {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al subir el logo')
      }
      const updated = data.company as CompanyBrandingRow
      applyUpdatedCompany(updated)
      setSelectedFiles((prev) => ({ ...prev, [companyId]: null }))
      setFileInputVersion((prev) => ({
        ...prev,
        [companyId]: (prev[companyId] ?? 0) + 1,
      }))
      setSuccessMsg(`Logo actualizado: ${updated.companyName}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el logo')
    } finally {
      setSavingId(null)
    }
  }

  const handleRemove = async (companyId: string) => {
    setSavingId(companyId)
    setSuccessMsg(null)
    setError(null)
    try {
      const response = await fetch(`/api/admin/branding/companies/${companyId}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al quitar el logo')
      }
      const updated = data.company as CompanyBrandingRow
      applyUpdatedCompany(updated)
      setSuccessMsg(`Logo quitado: ${updated.companyName}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al quitar el logo')
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
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-green-100 p-2">
            <ImageIcon className="h-6 w-6 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Logos
            </h1>
            <p className="text-sm text-muted-foreground">
              Sube el logo que cada laboratorio ve sobre el menú lateral. Sin logo se muestra el de LIMS.
              En el dominio de Nemachile el logo no cambia.
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
              {companies.length} compañía{companies.length === 1 ? '' : 's'}. png, jpeg, webp o svg, hasta 2 MB.
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Compañía</TableHead>
                  <TableHead>Logo</TableHead>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((row) => {
                  const selectedFile = selectedFiles[row.companyId]
                  const isSaving = savingId === row.companyId
                  return (
                    <TableRow key={row.companyId}>
                      <TableCell className="font-medium text-foreground">
                        {row.companyName}
                      </TableCell>
                      <TableCell>
                        {row.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.logoUrl}
                            alt={`Logo de ${row.companyName}`}
                            className="h-10 max-w-[140px] object-contain"
                          />
                        ) : (
                          <span className="text-sm text-muted-foreground">LIMS</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <input
                          key={`${row.companyId}-${fileInputVersion[row.companyId] ?? 0}`}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          aria-label={`Logo de ${row.companyName}`}
                          disabled={isSaving}
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null
                            setSelectedFiles((prev) => ({ ...prev, [row.companyId]: file }))
                          }}
                          className="block max-w-xs text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-green-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-green-800"
                        />
                        {selectedFile ? (
                          <p className="mt-1 text-xs text-muted-foreground">{selectedFile.name}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            onClick={() => void handleUpload(row.companyId)}
                            disabled={isSaving || !selectedFile}
                            size="sm"
                            className="gap-1"
                          >
                            {isSaving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            Subir
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void handleRemove(row.companyId)}
                            disabled={isSaving || !row.logoUrl}
                            size="sm"
                            className="gap-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Quitar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {companies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
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
