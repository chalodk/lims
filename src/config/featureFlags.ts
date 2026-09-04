/**
 * Registro de feature flags por company.
 * Defaults viven aquí. companies.feature_flags solo guarda overrides.
 */

export const FEATURE_FLAG_KEYS = ['producer_portal', 'ai_reports', 'payments'] as const

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number]

export type ResolvedFeatureFlags = Record<FeatureFlagKey, boolean>

export type FeatureFlagOverrides = Partial<ResolvedFeatureFlags>

export interface FeatureFlagDefinition {
  key: FeatureFlagKey
  label: string
  description: string
  defaultEnabled: boolean
  /** Si false, CSX puede persistir el valor pero el producto aún no lo respeta. */
  enforced: boolean
}

export const FEATURE_FLAG_REGISTRY: Record<FeatureFlagKey, FeatureFlagDefinition> = {
  producer_portal: {
    key: 'producer_portal',
    label: 'Portal productor',
    description:
      'Usuarios consumidor, panel /cliente e informes del productor. Apagar deja de crear cuentas nuevas y oculta el portal.',
    defaultEnabled: true,
    enforced: true,
  },
  ai_reports: {
    key: 'ai_reports',
    label: 'Informes con IA',
    description: 'El laboratorio usa informes con IA.',
    defaultEnabled: false,
    enforced: false,
  },
  payments: {
    key: 'payments',
    label: 'Pagos en plataforma',
    description:
      'El productor paga para habilitar informes. Requiere portal productor encendido.',
    defaultEnabled: false,
    enforced: false,
  },
}

export function isFeatureFlagKey(value: string): value is FeatureFlagKey {
  return (FEATURE_FLAG_KEYS as readonly string[]).includes(value)
}

export function featureFlagDefaults(): ResolvedFeatureFlags {
  return {
    producer_portal: FEATURE_FLAG_REGISTRY.producer_portal.defaultEnabled,
    ai_reports: FEATURE_FLAG_REGISTRY.ai_reports.defaultEnabled,
    payments: FEATURE_FLAG_REGISTRY.payments.defaultEnabled,
  }
}

export function parseFeatureFlagOverrides(raw: unknown): FeatureFlagOverrides {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }

  const overrides: FeatureFlagOverrides = {}
  const record = raw as Record<string, unknown>
  for (const key of FEATURE_FLAG_KEYS) {
    if (typeof record[key] === 'boolean') {
      overrides[key] = record[key]
    }
  }
  return overrides
}

/**
 * defaults ⊕ overrides. Si el portal está off, payments queda off.
 */
export function resolveCompanyFeatures(overrides: FeatureFlagOverrides = {}): ResolvedFeatureFlags {
  const resolved = featureFlagDefaults()
  for (const key of FEATURE_FLAG_KEYS) {
    if (overrides[key] !== undefined) {
      resolved[key] = overrides[key] as boolean
    }
  }
  if (!resolved.producer_portal) {
    resolved.payments = false
  }
  return resolved
}

/** Solo diffs vs default, después de sanitizar payments. */
export function compactFeatureFlagOverrides(resolved: ResolvedFeatureFlags): FeatureFlagOverrides {
  const overrides: FeatureFlagOverrides = {}
  for (const key of FEATURE_FLAG_KEYS) {
    if (resolved[key] !== FEATURE_FLAG_REGISTRY[key].defaultEnabled) {
      overrides[key] = resolved[key]
    }
  }
  return overrides
}

export function mergeFeatureFlagOverrides(
  existingRaw: unknown,
  patch: FeatureFlagOverrides
): FeatureFlagOverrides {
  const existing = parseFeatureFlagOverrides(existingRaw)
  const merged: FeatureFlagOverrides = { ...existing }
  for (const key of FEATURE_FLAG_KEYS) {
    if (patch[key] !== undefined) {
      merged[key] = patch[key]
    }
  }
  return compactFeatureFlagOverrides(resolveCompanyFeatures(merged))
}

export function parseFeatureFlagPatch(raw: unknown): FeatureFlagOverrides | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null
  }

  const record = raw as Record<string, unknown>
  const patch: FeatureFlagOverrides = {}
  let hasKnownKey = false

  for (const [key, value] of Object.entries(record)) {
    if (!isFeatureFlagKey(key)) {
      return null
    }
    if (typeof value !== 'boolean') {
      return null
    }
    patch[key] = value
    hasKnownKey = true
  }

  return hasKnownKey ? patch : null
}

export const PRODUCER_PORTAL_DISABLED_MESSAGE =
  'El portal de productores no está habilitado para este laboratorio.'
