'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { fieldClassName, textareaClassName } from '@/components/ui/form-field-styles'
import { SOIL_SAMPLED_BY_LABELS, todayIsoDate, type SoilSampledBy } from '@/lib/soil/sampleIntake'

interface ClientOption {
  id: string
  name: string
}

export default function NewSoilSamplePage() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [clientId, setClientId] = useState('')
  const [sampleCode, setSampleCode] = useState('')
  const [receivedAt, setReceivedAt] = useState(todayIsoDate)
  const [sampledAt, setSampledAt] = useState(todayIsoDate)
  const [sampledBy, setSampledBy] = useState<SoilSampledBy>('client')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const loadClients = async () => {
      try {
        const response = await fetch('/api/clients')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Error al cargar clientes')
        setClients(Array.isArray(data) ? data : [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Error al cargar el formulario')
      } finally {
        setIsLoading(false)
      }
    }
    void loadClients()
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsSaving(true)
    try {
      const response = await fetch('/api/soil/samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          code: sampleCode.trim(),
          received_at: receivedAt,
          sampled_at: sampledAt,
          sampled_by: sampledBy,
          notes: notes.trim() || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo registrar la muestra')
      router.push(`/suelo/${data.sample.id}`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo registrar la muestra')
      setIsSaving(false)
    }
  }

  const canSubmit = Boolean(clientId && sampleCode.trim() && receivedAt && sampledAt && sampledBy) && !isSaving

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <Link href="/suelo" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Muestras
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Nueva muestra</h1>
          <p className="text-sm text-muted-foreground">
            La matriz y los resultados se asignan al cargar la planilla.
          </p>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="grid gap-4 p-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="soil-client">Cliente</Label>
                <select
                  id="soil-client"
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  className={fieldClassName}
                  required
                >
                  <option value="">Selecciona un cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="soil-code">Código de muestra</Label>
                <input
                  id="soil-code"
                  inputMode="numeric"
                  value={sampleCode}
                  onChange={(event) => setSampleCode(event.target.value)}
                  placeholder="Ej: 1766"
                  className={fieldClassName}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="soil-received">Fecha de recepción</Label>
                <input
                  id="soil-received"
                  type="date"
                  value={receivedAt}
                  onChange={(event) => setReceivedAt(event.target.value)}
                  className={fieldClassName}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="soil-sampled">Toma de muestra</Label>
                <input
                  id="soil-sampled"
                  type="date"
                  value={sampledAt}
                  onChange={(event) => setSampledAt(event.target.value)}
                  className={fieldClassName}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="soil-sampled-by">Muestreado por</Label>
                <select
                  id="soil-sampled-by"
                  value={sampledBy}
                  onChange={(event) => setSampledBy(event.target.value as SoilSampledBy)}
                  className={fieldClassName}
                  required
                >
                  <option value="client">{SOIL_SAMPLED_BY_LABELS.client}</option>
                  <option value="lab">{SOIL_SAMPLED_BY_LABELS.lab}</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="soil-notes">Comentario</Label>
                <textarea
                  id="soil-notes"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className={textareaClassName}
                />
              </div>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={!canSubmit} className="gap-1">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Registrar muestra
              </Button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  )
}
