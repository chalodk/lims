'use client'

import { FormEvent, Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import { validateAdminPassword } from '@/lib/auth/adminPassword'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function readInviteNames(metadata: unknown): { userName: string; companyName: string } {
  if (!metadata || typeof metadata !== 'object') {
    return { userName: '', companyName: '' }
  }
  const record = metadata as { userName?: unknown; companyName?: unknown }
  return {
    userName: typeof record.userName === 'string' ? record.userName : '',
    companyName: typeof record.companyName === 'string' ? record.companyName : '',
  }
}

function SetPasswordScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const started = useRef(false)
  const [isOpeningLink, setIsOpeningLink] = useState(true)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const supabase = getSupabaseClient()
    const tokenHash = searchParams.get('token_hash')
    const otpType = searchParams.get('type')

    async function openInviteSession() {
      if (tokenHash && otpType === 'invite') {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'invite',
        })
        if (!error && data.user) {
          const names = readInviteNames(data.user.user_metadata)
          setUserName(names.userName)
          setCompanyName(names.companyName)
          setIsOpeningLink(false)
          return
        }
      }

      const { data: existing } = await supabase.auth.getUser()
      if (existing.user) {
        const names = readInviteNames(existing.user.user_metadata)
        setUserName(names.userName)
        setCompanyName(names.companyName)
        setIsOpeningLink(false)
        return
      }

      setLinkError('El enlace no es válido o ya venció.')
      setIsOpeningLink(false)
    }

    void openInviteSession()
  }, [searchParams])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const parsed = validateAdminPassword(password, confirmation)
    if (!parsed.ok) {
      setFormError(parsed.error)
      return
    }

    setIsSaving(true)
    setFormError(null)
    const { error } = await getSupabaseClient().auth.updateUser({ password })
    if (error) {
      setFormError('No se pudo guardar la contraseña')
      setIsSaving(false)
      return
    }
    router.replace('/dashboard')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Elegir contraseña</h1>
        {isOpeningLink ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : linkError ? (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {linkError}
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              {userName ? `Hola ${userName}. ` : ''}
              {companyName ? `Vas a entrar a ${companyName}. ` : ''}
              Escribe la contraseña dos veces para iniciar sesión.
            </p>
            <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 space-y-4">
              {formError ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {formError}
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="new-password">Contraseña</Label>
                <Input
                  id="new-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSaving}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Repetir contraseña</Label>
                <Input
                  id="confirm-password"
                  name="confirmation"
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  disabled={isSaving}
                  required
                />
              </div>
              <Button type="submit" disabled={isSaving} className="w-full gap-1.5">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Guardar e ingresar
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </main>
      }
    >
      <SetPasswordScreen />
    </Suspense>
  )
}
