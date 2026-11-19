'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isVerticalKey, VERTICAL_LABELS, type VerticalKey } from '@/config/verticals'
import PestDashboard from '@/app/dashboard/PestDashboard'
import SoilDashboard from '@/app/dashboard/SoilDashboard'

const STORAGE_KEY = 'lims.dashboard.companyId'

type CsxCompanyRow = {
  companyId: string
  companyName: string
  verticalKey: string | null
}

function companyOptionLabel(company: CsxCompanyRow) {
  if (company.verticalKey && isVerticalKey(company.verticalKey)) {
    return `${company.companyName} · ${VERTICAL_LABELS[company.verticalKey]}`
  }
  return company.companyName
}

export default function CsxDashboard() {
  const [companies, setCompanies] = useState<CsxCompanyRow[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCompanies() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/admin/verticals/companies')
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'No se pudieron cargar los laboratorios')
        }
        if (cancelled) return
        const rows = (data.companies || []) as CsxCompanyRow[]
        setCompanies(rows)
        const storedCompanyId = sessionStorage.getItem(STORAGE_KEY)
        if (storedCompanyId && rows.some((company) => company.companyId === storedCompanyId)) {
          setSelectedCompanyId(storedCompanyId)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'No se pudieron cargar los laboratorios')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadCompanies()
    return () => {
      cancelled = true
    }
  }, [])

  function chooseCompany(companyId: string) {
    setSelectedCompanyId(companyId)
    if (companyId) {
      sessionStorage.setItem(STORAGE_KEY, companyId)
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }

  const selectedCompany = companies.find((company) => company.companyId === selectedCompanyId) ?? null
  const selectedVertical: VerticalKey | null =
    selectedCompany?.verticalKey && isVerticalKey(selectedCompany.verticalKey) ? selectedCompany.verticalKey : null

  return (
    <div>
      <div className="border-b border-border px-6 py-4">
        <label htmlFor="dashboard-company" className="mb-2 block text-sm font-medium text-foreground">
          Laboratorio
        </label>
        <select
          id="dashboard-company"
          value={selectedCompanyId}
          onChange={(event) => chooseCompany(event.target.value)}
          className="w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
          disabled={isLoading || companies.length === 0}
        >
          <option value="">Elige un laboratorio</option>
          {companies.map((company) => (
            <option key={company.companyId} value={company.companyId}>
              {companyOptionLabel(company)}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      ) : error ? (
        <div className="mx-auto max-w-xl p-6">
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            {error}
          </div>
        </div>
      ) : !selectedCompany ? (
        <div className="mx-auto max-w-xl p-6">
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            Elige un laboratorio para ver su dashboard.
          </div>
        </div>
      ) : !selectedCompany.verticalKey ? (
        <div className="mx-auto max-w-xl p-6">
          <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            <p>{selectedCompany.companyName} no tiene una vertical asignada.</p>
            <Button asChild variant="outline">
              <Link href="/admin/verticals">Asignar vertical</Link>
            </Button>
          </div>
        </div>
      ) : selectedVertical === 'plagas_patogenos' ? (
        <PestDashboard companyId={selectedCompany.companyId} />
      ) : selectedVertical === 'suelo' ? (
        <SoilDashboard companyId={selectedCompany.companyId} showShortcuts={false} />
      ) : (
        <div className="mx-auto max-w-xl p-6">
          <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            Esta vertical todavía no tiene dashboard.
          </div>
        </div>
      )}
    </div>
  )
}
