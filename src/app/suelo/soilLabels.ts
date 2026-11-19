export type SoilSampleStatus = 'received' | 'in_analysis' | 'completed'

export const SOIL_SAMPLE_STATUS_LABELS: Record<SoilSampleStatus, string> = {
  received: 'Recibida',
  in_analysis: 'En análisis',
  completed: 'Completa',
}
