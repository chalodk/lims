// Proyectos disponibles para muestras
export const PROJECT_OPTIONS = [
  'Externa',
  'Syngenta (Circulo Syngenta)',
  'Syngenta (Ensayos)',
  'FMC',
  'Copeval',
  'Bayer',
  'Basf',
  'Corteva',
  'Anasac',
  'UPL',
  'Trical',
  'Agrospec'
] as const

// Categorización de proyectos
export const PROJECT_CATEGORIES = {
  EXTERNAL: ['Externa'],
  AGRICULTURAL_COMPANIES: [
    'Syngenta (Circulo Syngenta)',
    'Syngenta (Ensayos)',
    'FMC',
    'Copeval',
    'Bayer',
    'Basf',
    'Corteva',
    'Anasac',
    'UPL',
    'Trical',
    'Agrospec'
  ]
} as const

// Tipo para TypeScript
export type ProjectType = typeof PROJECT_OPTIONS[number] | null