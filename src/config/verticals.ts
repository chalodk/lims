export const VERTICAL_KEYS = ['plagas_patogenos', 'suelo'] as const

export type VerticalKey = (typeof VERTICAL_KEYS)[number]

export const VERTICAL_LABELS: Record<VerticalKey, string> = {
  plagas_patogenos: 'Plagas y patógenos',
  suelo: 'Suelo y nutrición',
}

export interface CompanyVerticalRow {
  active: boolean
  is_primary: boolean
  vertical_key: string
}

export type SessionVertical =
  | { status: 'assigned'; key: VerticalKey }
  | { status: 'none' }

export function isVerticalKey(value: unknown): value is VerticalKey {
  return typeof value === 'string' && (VERTICAL_KEYS as readonly string[]).includes(value)
}

/**
 * Vertical activa de la sesión: la fila primaria y activa de la company.
 * Sin primaria activa (o con una key desconocida) no hay vertical: no se cae a plagas.
 */
export function resolveSessionVertical(rows: CompanyVerticalRow[]): SessionVertical {
  const primaryRow = rows.find((row) => row.active && row.is_primary)
  if (!primaryRow || !isVerticalKey(primaryRow.vertical_key)) {
    return { status: 'none' }
  }
  return { status: 'assigned', key: primaryRow.vertical_key }
}

const PLAGAS_ONLY_ROUTES = ['/samples', '/results', '/reports', '/estadisticas']
const SUELO_ONLY_ROUTES = ['/suelo']

/**
 * Rutas propias de una vertical. /dashboard sigue permitida para todas:
 * el contenido lo elige la vertical primaria. Clientes, configuración y admin
 * no dependen de la vertical.
 */
export function isRouteAllowedForVertical(href: string, sessionVertical: SessionVertical): boolean {
  const matches = (prefixes: string[]) =>
    prefixes.some((prefix) => href === prefix || href.startsWith(`${prefix}/`))

  if (matches(PLAGAS_ONLY_ROUTES)) {
    return sessionVertical.status === 'assigned' && sessionVertical.key === 'plagas_patogenos'
  }
  if (matches(SUELO_ONLY_ROUTES)) {
    return sessionVertical.status === 'assigned' && sessionVertical.key === 'suelo'
  }
  return true
}
