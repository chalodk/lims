export function sanitizeResultsSearchTerm(raw: string): string {
  return raw
    .trim()
    .replace(/[%_,."*()\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildResultsSearchOrFilter(
  raw: string,
  matchingSampleIds: string[] = []
): string | null {
  const term = sanitizeResultsSearchTerm(raw)
  const parts: string[] = []

  if (term) {
    const pattern = `%${term}%`
    parts.push(`pathogen_identified.ilike.${pattern}`)
    parts.push(`diagnosis.ilike.${pattern}`)
  }

  if (matchingSampleIds.length > 0) {
    parts.push(`sample_id.in.(${matchingSampleIds.join(',')})`)
  }

  return parts.length > 0 ? parts.join(',') : null
}
