export const SPECIES_FAMILIES = [
  {
    key: 'carozos',
    label: 'Carozos',
    species: ['Cerezo de japón', 'Cerezo dulce', 'Ciruelo europeo', 'Ciruelo japonés', 'Duraznero', 'Nectarino'],
  },
  {
    key: 'pomaceas',
    label: 'Pomáceas',
    species: ['Manzano', 'Peral'],
  },
  {
    key: 'citricos',
    label: 'Cítricos',
    species: ['Clementino', 'Limón', 'Mandarino', 'Naranjo'],
  },
  {
    key: 'berries',
    label: 'Berries',
    species: ['Arándano', 'Frambueso', 'Frutilla'],
  },
  {
    key: 'frutos_secos',
    label: 'Frutos secos',
    species: ['Avellano', 'Nogal'],
  },
  {
    key: 'cereales',
    label: 'Cereales y gramíneas',
    species: ['Avena', 'Trigo'],
  },
  {
    key: 'solanaceas',
    label: 'Solanáceas',
    species: ['Papa', 'Pimiento', 'Tomate'],
  },
  {
    key: 'leguminosas',
    label: 'Leguminosas / forrajeras',
    species: ['Poroto', 'Trébol'],
  },
  {
    key: 'umbeliferas',
    label: 'Umbelíferas / apiáceas',
    species: ['Cilantro', 'Zanahoria'],
  },
  {
    key: 'cucurbitaceas',
    label: 'Cucurbitáceas',
    species: ['Pepino'],
  },
  {
    key: 'lamiaceas',
    label: 'Lamiáceas',
    species: ['Menta'],
  },
  {
    key: 'flores',
    label: 'Flores y ornamentales',
    species: ['Lilium', 'Peonia'],
  },
  {
    key: 'otros',
    label: 'Otros frutales y cultivos',
    species: ['Kiwi verde', 'Palto', 'Vid'],
  },
  {
    key: 'desconocido',
    label: 'Desconocido',
    species: ['Desconocido'],
  },
] as const

export type SpeciesFamilyKey = (typeof SPECIES_FAMILIES)[number]['key']
export type SpeciesFamily = (typeof SPECIES_FAMILIES)[number]

const familyByKey = new Map<string, SpeciesFamily>(SPECIES_FAMILIES.map((family) => [family.key, family]))

const familyBySpecies = new Map<string, SpeciesFamily>()
for (const family of SPECIES_FAMILIES) {
  for (const speciesName of family.species) {
    familyBySpecies.set(foldSpeciesName(speciesName), family)
  }
}

export function foldSpeciesName(speciesName: string): string {
  return speciesName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export function resolveSpeciesFamily(raw: string | null | undefined): SpeciesFamily | null {
  const input = raw?.trim().toLowerCase()
  if (!input) return null
  return familyByKey.get(input) ?? null
}

export function parseSpeciesFamilyQuery(raw: string | null):
  | { ok: true; family: SpeciesFamily | null }
  | { ok: false; status: 400; error: string } {
  if (raw === null || raw.trim() === '') {
    return { ok: true, family: null }
  }
  const family = resolveSpeciesFamily(raw)
  if (!family) {
    return { ok: false, status: 400, error: 'Familia de especie desconocida' }
  }
  return { ok: true, family }
}

export function sampleMatchesSpeciesFamily(
  species: string | null | undefined,
  family: SpeciesFamily | null
): boolean {
  if (!family) return true
  if (!species?.trim()) return false
  return familyBySpecies.get(foldSpeciesName(species))?.key === family.key
}
