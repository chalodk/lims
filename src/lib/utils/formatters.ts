/**
 * Common formatting utilities to handle null values and provide consistent formatting
 */

// Safe date formatting
export const formatDate = (date: string | null | undefined, locale: string = 'es-ES'): string => {
  if (!date) return 'N/A'
  try {
    return new Date(date).toLocaleDateString(locale)
  } catch {
    return 'Fecha inválida'
  }
}

export const formatDateTime = (date: string | null | undefined, locale: string = 'es-ES'): string => {
  if (!date) return 'N/A'
  try {
    return new Date(date).toLocaleString(locale)
  } catch {
    return 'Fecha inválida'
  }
}

// Calculate days ago
export const getDaysAgo = (date: string | null | undefined): number => {
  if (!date) return 0
  try {
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
  } catch {
    return 0
  }
}

// Safe string formatting
export const formatText = (text: string | null | undefined, fallback: string = 'N/A'): string => {
  return text || fallback
}

export const capitalize = (text: string | null | undefined): string => {
  if (!text) return 'N/A'
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

export const formatTestArea = (area: string | null | undefined): string => {
  if (!area) return 'N/A'
  return area.replace(/_/g, ' ').split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ')
}