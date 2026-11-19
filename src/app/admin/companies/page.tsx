'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Loader2, Plus, UserPlus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { BILLING_TIERS, resolvePlanTier, TRIAL_DURATION_DAYS } from '@/config/billingTiers'
import { COMPANY_NAME_MAX_LENGTH, parseCompanyName, type CreatedCompany } from '@/lib/companies/createCompany'
import { ADMIN_NAME_MAX_LENGTH } from '@/lib/companies/inviteCompanyAdmin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type CompanyRow = {
  id: string
  name: string
  firstAdminEmail: string | null
}

function formatTrialEnd(trialEndsAt: string): string {
  const trialEnd = new Date(trialEndsAt)
  if (Number.isNaN(trialEnd.getTime())) return ''
  return trialEnd.toLocaleDateString('es-CL', { dateStyle: 'long' })
}

function createdCompanyMessage(company: CreatedCompany): string {
  const planLabel = BILLING_TIERS[resolvePlanTier(company.plan_tier)].label
  const trialEndLabel = formatTrialEnd(company.trial_ends_at)
  const trialText = trialEndLabel ? `, prueba hasta el ${trialEndLabel}` : ''
  return `Compañía creada: ${company.name}. Plan ${planLabel}${trialText}.`
}

export default function AdminCompaniesPage() {
  const router = useRouter()
  const { userRole, isAuthenticated, isLoading: authLoading } = useAuth()
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [companyName, setCompanyName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [inviteCompany, setInviteCompany] = useState<CompanyRow | null>(null)
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [isInviting, setIsInviting] = useState(false)

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true)
    setListError(null)
    try {
      const response = await fetch('/api/admin/companies')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar compañías')
      }
      const rows = (data.companies || []) as CompanyRow[]
      setCompanies(
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          firstAdminEmail: row.firstAdminEmail ?? null,
        }))
      )
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Error al cargar compañías')
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

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsedName = parseCompanyName(companyName)
    if (!parsedName.ok) {
      setSuccessMsg(null)
      setFormError(parsedName.error)
      return
    }

    setIsSaving(true)
    setSuccessMsg(null)
    setFormError(null)
    try {
      const response = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: parsedName.name }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la compañía')
      }

      const created = data.company as CreatedCompany
      setCompanies((current) =>
        [
          ...current.filter((row) => row.id !== created.id),
          { id: created.id, name: created.name, firstAdminEmail: null },
        ].sort((left, right) => left.name.localeCompare(right.name, 'es'))
      )
      setCompanyName('')
      setSuccessMsg(createdCompanyMessage(created))
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear la compañía')
    } finally {
      setIsSaving(false)
    }
  }

  const openInvite = (company: CompanyRow) => {
    setInviteCompany(company)
    setAdminName('')
    setAdminEmail('')
    setInviteError(null)
  }

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!inviteCompany) return

    setIsInviting(true)
    setInviteError(null)
    setSuccessMsg(null)
    try {
      const response = await fetch(`/api/admin/companies/${inviteCompany.id}/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: adminName, email: adminEmail }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al invitar al administrador')
      }

      const invitedEmail = typeof data.user?.email === 'string' ? data.user.email : adminEmail.trim()
      setCompanies((current) =>
        current.map((row) =>
          row.id === inviteCompany.id ? { ...row, firstAdminEmail: invitedEmail } : row
        )
      )
      setInviteCompany(null)
      setSuccessMsg(
        `Invitación enviada a ${invitedEmail}. Tiene que confirmar el correo para entrar.`
      )
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Error al invitar al administrador')
    } finally {
      setIsInviting(false)
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
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-green-100 p-2">
            <Building2 className="h-6 w-6 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Compañías</h1>
            <p className="text-sm text-muted-foreground">
              Alta de un laboratorio. Queda en plan Growth con {TRIAL_DURATION_DAYS} días de prueba.
              El plan y la vertical se asignan después.
            </p>
          </div>
        </div>

        {listError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {listError}
          </div>
        ) : null}
        {formError ? (
          <div id="company-name-error" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {formError}
          </div>
        ) : null}
        {successMsg ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700" role="status">
            {successMsg}
          </div>
        ) : null}

        <Card>
          <CardHeader className="border-b border-gray-100 py-3">
            <CardTitle className="text-base">Nueva compañía</CardTitle>
            <CardDescription>Solo el nombre. El servidor fija el plan, la prueba y los flags.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => void handleCreate(event)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="company-name">Nombre</Label>
                <Input
                  id="company-name"
                  name="name"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  maxLength={COMPANY_NAME_MAX_LENGTH}
                  autoComplete="organization"
                  placeholder="Nombre del laboratorio"
                  disabled={isSaving}
                  aria-invalid={formError ? true : undefined}
                  aria-describedby={formError ? 'company-name-error' : undefined}
                />
              </div>
              <Button type="submit" disabled={isSaving || companyName.trim().length === 0} className="gap-1.5">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Crear
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-gray-100 py-3">
            <CardTitle className="text-base">Registradas</CardTitle>
            <CardDescription>
              {companies.length} compañía{companies.length === 1 ? '' : 's'}
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Compañía</TableHead>
                  <TableHead>Primer admin</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium text-foreground">{company.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {company.firstAdminEmail ?? 'Sin usuario'}
                    </TableCell>
                    <TableCell>
                      {company.firstAdminEmail ? null : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => openInvite(company)}
                        >
                          <UserPlus className="h-4 w-4" />
                          Invitar admin
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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

        <Dialog
          open={inviteCompany !== null}
          onOpenChange={(open) => {
            if (!open && !isInviting) setInviteCompany(null)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar administrador</DialogTitle>
              <DialogDescription>
                Le enviaremos un correo para confirmar la cuenta y elegir su contraseña. Será el primer
                usuario de {inviteCompany?.name}.
              </DialogDescription>
            </DialogHeader>
            <form id="invite-admin-form" onSubmit={(event) => void handleInvite(event)} className="space-y-4 px-6 pb-2">
              {inviteError ? (
                <div id="invite-admin-error" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {inviteError}
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="admin-name">Nombre</Label>
                <Input
                  id="admin-name"
                  name="name"
                  value={adminName}
                  onChange={(event) => setAdminName(event.target.value)}
                  maxLength={ADMIN_NAME_MAX_LENGTH}
                  autoComplete="name"
                  placeholder="Nombre del administrador"
                  disabled={isInviting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input
                  id="admin-email"
                  name="email"
                  type="email"
                  value={adminEmail}
                  onChange={(event) => setAdminEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="admin@laboratorio.com"
                  disabled={isInviting}
                  aria-invalid={inviteError ? true : undefined}
                  aria-describedby={inviteError ? 'invite-admin-error' : undefined}
                />
              </div>
            </form>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteCompany(null)}
                disabled={isInviting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="invite-admin-form"
                disabled={isInviting || adminName.trim().length === 0 || adminEmail.trim().length === 0}
                className="gap-1.5"
              >
                {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Enviar invitación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
