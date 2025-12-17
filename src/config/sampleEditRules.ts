/**
 * Configuración de reglas de edición para muestras
 * Define qué campos pueden editarse cuando una muestra tiene resultados validados
 */

/**
 * Campos que NUNCA pueden editarse cuando hay resultados validados
 * Estos campos afectan la integridad de los resultados y deben permanecer inmutables
 */
export const BLOCKED_WHEN_VALIDATED: string[] = [
  'code',              // Código de muestra - identificación única
  'species',           // Especie - afecta el tipo de análisis
  'client_id',         // Cliente - afecta la propiedad de los datos
  'received_date',     // Fecha de recepción - afecta cálculos de SLA y fechas
  'variety',           // Variedad - puede afectar interpretación de resultados
  'rootstock',         // Portainjerto - puede afectar interpretación
  'planting_year',     // Año de plantación - contexto histórico
  'previous_crop',     // Cultivo anterior - contexto histórico
  'next_crop',         // Próximo cultivo - contexto histórico
  'fallow',            // Terreno en barbecho - contexto histórico
  'project_id',        // Proyecto - puede afectar agrupación de datos
  'sla_type',          // Tipo de SLA - afecta cálculos de fechas
  'region',            // Región - contexto geográfico
  'locality',          // Localidad - contexto geográfico
  'taken_by',          // Recolectada por - contexto de muestreo
  'sampling_method',   // Método de muestreo
  'suspected_pathogen', // Patógeno sospechado - puede afectar análisis
]

/**
 * Campos que SÍ pueden editarse cuando hay resultados validados
 * Estos campos no afectan la integridad de los resultados y pueden actualizarse
 */
export const EDITABLE_WHEN_VALIDATED: string[] = [
  'status',                    // Estado de la muestra - puede cambiar durante el proceso
  'sla_status',               // Estado SLA - puede actualizarse según progreso
  'due_date',                 // Fecha de vencimiento - puede ajustarse
  'client_notes',             // Notas del cliente - información adicional
  'reception_notes',          // Notas de recepción - información adicional
  'sampling_observations',    // Observaciones de muestreo - información adicional
  'reception_observations',   // Observaciones de recepción - información adicional
]

/**
 * Verifica si un campo puede editarse cuando hay resultados validados
 * @param fieldName - Nombre del campo a verificar
 * @param hasValidatedResults - Si la muestra tiene resultados validados
 * @returns true si el campo puede editarse, false si está bloqueado
 */
export function canEditField(fieldName: string, hasValidatedResults: boolean): boolean {
  // Si no hay resultados validados, todos los campos son editables
  if (!hasValidatedResults) {
    return true
  }
  
  // Si el campo está en la lista de bloqueados, no puede editarse
  if (BLOCKED_WHEN_VALIDATED.includes(fieldName)) {
    return false
  }
  
  // Si el campo está explícitamente en la lista de editables, puede editarse
  if (EDITABLE_WHEN_VALIDATED.includes(fieldName)) {
    return true
  }
  
  // Por defecto, si no está en ninguna lista, se bloquea (seguridad por defecto)
  return false
}

