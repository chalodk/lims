'use client'

import Image from 'next/image'
import { Fraunces } from 'next/font/google'
import {
  ArrowRight,
  ClipboardList,
  DollarSign,
  Loader2,
  Lock,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { LIMS_LOGO_URL } from '@/lib/branding/hostBranding'
import { usePasswordLogin } from '@/hooks/usePasswordLogin'
import { cn } from '@/lib/utils'

const displayFont = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600'],
})

const CONTACT_WHATSAPP_URL =
  'https://wa.me/56997023645?text=Hola%2C%20necesito%20ayuda%20para%20ingresar%20al%20portal%20LIMS'

const FEATURE_CARDS = [
  {
    title: 'Recibe',
    description: 'Ingresa y vincula muestras a cada orden de trabajo.',
    icon: ClipboardList,
  },
  {
    title: 'Entrega',
    description: 'Entrega el resultado validado de cada análisis con un sólo clic.',
    icon: UserRound,
  },
  {
    title: 'Cobra',
    description: 'Concilia automáticamente las órdenes de tus clientes.',
    icon: DollarSign,
  },
] as const

function PortalMark() {
  return (
    <div className="flex items-center gap-3" aria-label="LIMS Agroanalytics">
      <Image
        src={LIMS_LOGO_URL}
        alt="LIMS"
        width={2000}
        height={2000}
        className="h-16 w-16 rounded-xl object-cover shadow-sm"
        sizes="64px"
        priority
      />
      <div className="flex flex-col leading-none">
        <span className="text-[1.65rem] font-semibold tracking-tight text-emerald-950">LIMS</span>
        <span className="mt-1 text-[10px] font-semibold tracking-[0.18em] text-emerald-800/70 uppercase">
          Agroanalytics
        </span>
      </div>
    </div>
  )
}

export default function GenericLimsLoginScreen() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    showPassword,
    setShowPassword,
    error,
    handleSubmit,
  } = usePasswordLogin()

  return (
    <div className="min-h-screen bg-[#f6f3ee] lg:grid lg:grid-cols-2">
      <section className="relative isolate overflow-hidden bg-[#0b0d0c] px-6 py-10 text-white sm:px-10 lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:px-14 lg:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_12%,rgba(196,181,253,0.28),transparent_42%),radial-gradient(ellipse_at_88%_78%,rgba(92,191,92,0.22),transparent_48%),linear-gradient(165deg,#141414_0%,#0c0c0c_55%,#101410_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-violet-200/15"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 right-16 h-56 w-56 rounded-full border border-green-300/15"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-24 left-[40%] h-40 w-40 rounded-full border border-white/5"
        />
        <Image
          src={LIMS_LOGO_URL}
          alt=""
          width={2000}
          height={2000}
          className="pointer-events-none absolute -bottom-10 -right-8 h-[26rem] w-[26rem] rounded-[2.5rem] object-cover opacity-50"
          aria-hidden="true"
        />

        <div className="relative z-10">
          <p className="flex items-center gap-3 text-[11px] font-medium tracking-[0.28em] text-white/70 uppercase">
            <span className="h-px w-8 bg-white/40" />
            Agroanalytics · LIMS
          </p>
          <p className="mt-10 text-[11px] font-semibold tracking-[0.26em] text-green-300/90 uppercase">
            Portal de operaciones y clientes
          </p>
          <h1
            className={cn(
              displayFont.className,
              'mt-4 max-w-xl text-4xl leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.35rem]'
            )}
          >
            Todo el recorrido de una muestra, en un solo lugar.
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/75 sm:text-base">
            La primera herramienta digital agrícola para registrar muestras, generar informes automáticos de cada análisis y un portal de clientes para entrega de resultados.
          </p>
        </div>

        <div className="relative z-10 mt-10 hidden gap-3 sm:grid sm:grid-cols-3 lg:mt-0">
          {FEATURE_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.title}
                className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5">
                  <Icon className="h-5 w-5 text-white" strokeWidth={1.6} />
                </div>
                <p className="text-sm font-semibold text-white">{card.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-white/70">{card.description}</p>
              </div>
            )
          })}
        </div>

        <div className="relative z-10 mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/70 lg:mt-0">
          <span className="inline-flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/25">
              <Lock className="h-3 w-3" />
            </span>
            Entorno privado y protegido
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-white/40 sm:inline-block" />
          <span>Información separada por organización</span>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-16">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 flex items-start justify-between gap-4">
            <PortalMark />
            <span className="mt-1 inline-flex items-center rounded-full bg-[#389858]/10 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-[#2d7a48] uppercase">
              Portal privado
            </span>
          </div>

          <p className="text-[11px] font-semibold tracking-[0.22em] text-[#389858] uppercase">
            Bienvenido
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
            Ingresa a tu cuenta
          </h2>
          <p className="mt-2 text-sm text-stone-500">
            Accede con las credenciales asignadas por tu laboratorio.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-stone-700">
                Usuario
              </label>
              <div className="flex items-center gap-3 rounded-2xl bg-[#eceae4] px-2 py-2 focus-within:ring-2 focus-within:ring-[#389858]/25">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#389858] text-white">
                  <UserRound className="h-4 w-4" />
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 w-full bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
                  placeholder="Correo electrónico"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-stone-700">
                  Contraseña
                </label>
                <a
                  href={CONTACT_WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-stone-400 hover:text-[#2d7a48]"
                >
                  ¿Necesitas ayuda?
                </a>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-[#eceae4] px-2 py-2 focus-within:ring-2 focus-within:ring-[#389858]/25">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#389858] text-white">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-11 w-full bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="pr-3 text-xs font-medium text-stone-400 hover:text-stone-700"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#389858] text-sm font-semibold text-white transition-colors hover:bg-[#2d7a48] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Ingresar al portal
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-stone-200/80 bg-white/70 px-4 py-3 text-xs text-stone-500">
            <ShieldCheck className="h-4 w-4 text-[#389858]" />
            <span>
              <span className="font-medium text-stone-700">Conexión protegida</span>
              <span className="mx-1.5 text-stone-300">·</span>
              Tus credenciales y servicios permanecen privados.
            </span>
          </div>

          <p className="mt-8 text-center text-xs text-stone-400">
            ¿Tienes problemas para ingresar?{' '}
            <a
              href={CONTACT_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#2d7a48] hover:underline"
            >
              Contacta con Agroanalytics
            </a>
          </p>
        </div>
      </section>
    </div>
  )
}
