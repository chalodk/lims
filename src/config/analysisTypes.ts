/**
 * Registro centralizado de tipos de análisis.
 *
 * Fuente única de verdad para: claves canónicas, etiquetas en español,
 * metadatos de UI (colores, iniciales), mapeo a áreas de BD,
 * templates PDFMonkey y valores por defecto.
 *
 * Para agregar un nuevo tipo de análisis:
 * 1. Agregar la clave a ANALYSIS_TYPE_KEYS
 * 2. Agregar la entrada en ANALYSIS_TYPE_REGISTRY
 * 3. Si requiere payload personalizado, agregar el builder en pdfmonkey/route.ts
 */

// ── Claves canónicas (inglés, usadas en código) ──
export const ANALYSIS_TYPE_KEYS = [
  'virology',
  'phytopatology', // conocido typo: debería ser 'phytopathology', se mantiene por compatibilidad
  'phytopathology_isolation',
  'bacteriology',
  'nematology',
  'early_detection',
  'default',
] as const;

export type AnalysisType = (typeof ANALYSIS_TYPE_KEYS)[number];

// ── Valores de área en BD (español, almacenados en test_catalog.area) ──
export const DB_AREA_VALUES = [
  'nematologia',
  'fitopatologia',
  'virologia',
  'bacteriologia',
  'deteccion_precoz',
] as const;

export type DbArea = (typeof DB_AREA_VALUES)[number];

// ── Forma de cada entrada del registro ──
export interface AnalysisTypeEntry {
  /** Clave canónica en inglés */
  key: AnalysisType;
  /** Etiqueta en español para mostrar en UI */
  label: string;
  /** Inicial(es) corta(s) para el círculo indicador */
  initial: string;
  /** Clases Tailwind de fondo para el badge */
  bgColor: string;
  /** Clases Tailwind de texto para el badge */
  textColor: string;
  /** Áreas de BD que mapean a este tipo (lookup exacto, no substring) */
  dbAreas: DbArea[];
  /** Nombre de la variable de entorno para el template ID de PDFMonkey */
  templateEnvVar: string;
  /** Template ID por defecto si la variable de entorno no está configurada */
  fallbackTemplateId: string;
  /** Título por defecto del informe */
  tituloInforme: string;
  /** Descripción por defecto del tipo de análisis */
  tipoAnalisisDescripcion: string;
  /** Descripción por defecto de la metodología */
  metodologiaDescripcion: string;
}

// ── El registro canónico ──
export const ANALYSIS_TYPE_REGISTRY: Record<AnalysisType, AnalysisTypeEntry> = {
  virology: {
    key: 'virology',
    label: 'Virológico',
    initial: 'V',
    bgColor: 'bg-sky-700',
    textColor: 'text-white',
    dbAreas: ['virologia'],
    templateEnvVar: 'PDFMONKEY_TEMPLATE_VIROLOGY',
    fallbackTemplateId: '0D6C351F-BFFF-4FFF-8960-59763FA3018F',
    tituloInforme: 'INFORME VIROLÓGICO',
    tipoAnalisisDescripcion: 'Determinación de virus fitopatógenos.',
    metodologiaDescripcion: 'Metodología estándar para análisis virológico.',
  },
  phytopatology: {
    key: 'phytopatology',
    label: 'Fitopatológico',
    initial: 'F',
    bgColor: 'bg-green-600',
    textColor: 'text-white',
    dbAreas: ['fitopatologia'],
    templateEnvVar: 'PDFMONKEY_TEMPLATE_PHYTOPATOLOGY',
    fallbackTemplateId: '5AA9EEB6-73F7-4370-AF58-F932A541100B',
    tituloInforme: 'INFORME FITOPATOLÓGICO',
    tipoAnalisisDescripcion: 'Determinación de patógenos vegetales.',
    metodologiaDescripcion:
      'Se efectuaron tres diluciones (10⁻¹, 10⁻² y 10⁻³) de cada muestra de suelo previamente tamizadas. Posteriormente se extrajo 1 ml de cada dilución, sembrándolas en placas de Petri con medios de cultivos específicos para el desarrollo de hongos. Después del período de incubación, se hizo el recuento del número de colonias presentes en las placas correspondientes a las tres diluciones de cada muestra de suelo. Los resultados se expresan en número de colonias de hongos por muestra analizada.',
  },
  phytopathology_isolation: {
    key: 'phytopathology_isolation',
    label: 'Fitopatológico (aislamiento)',
    initial: 'FA',
    bgColor: 'bg-green-700',
    textColor: 'text-white',
    dbAreas: [],
    templateEnvVar: 'PDFMONKEY_TEMPLATE_PHYTOPATOLOGY_ISOLATION',
    fallbackTemplateId: '0CA8ED92-4D05-4444-A973-10AFD682501B',
    tituloInforme: 'INFORME FITOPATOLÓGICO',
    tipoAnalisisDescripcion: 'Aislamiento e identificación de microorganismos en tejido vegetal.',
    metodologiaDescripcion:
      'Aislamiento e identificación de microorganismos a partir del tejido vegetal analizado.',
  },
  bacteriology: {
    key: 'bacteriology',
    label: 'Bacteriológico',
    initial: 'B',
    bgColor: 'bg-blue-600',
    textColor: 'text-white',
    dbAreas: ['bacteriologia'],
    templateEnvVar: 'PDFMONKEY_TEMPLATE_BACTERIOLOGY',
    fallbackTemplateId: 'BFFA2B14-DA47-4D06-B593-0CC084D374C6',
    tituloInforme: 'INFORME BACTERIOLÓGICO',
    tipoAnalisisDescripcion: 'Determinación de bacterias fitopatógenas.',
    metodologiaDescripcion: 'Metodología estándar para análisis bacteriológico.',
  },
  nematology: {
    key: 'nematology',
    label: 'Nematológico',
    initial: 'N',
    bgColor: 'bg-purple-600',
    textColor: 'text-white',
    dbAreas: ['nematologia'],
    templateEnvVar: 'PDFMONKEY_TEMPLATE_NEMATOLOGY',
    fallbackTemplateId: '1D6880A8-BEDA-4538-86CA-4121557E88FE',
    tituloInforme: 'INFORME NEMATOLÓGICO',
    tipoAnalisisDescripcion:
      'Determinación de nematodos fitoparásitos de formas móviles y enquistadas en suelo.',
    metodologiaDescripcion:
      'Para la determinación de nematodos fitoparásitos en formas móviles se utilizó el Método de Tamizado de Cobb y Embudo de Baermann.',
  },
  early_detection: {
    key: 'early_detection',
    label: 'Detección Precoz',
    initial: 'DP',
    bgColor: 'bg-yellow-600',
    textColor: 'text-white',
    dbAreas: ['deteccion_precoz'],
    templateEnvVar: 'PDFMONKEY_TEMPLATE_EARLY_DETECTION',
    fallbackTemplateId: '6AD1FA7C-65EE-4E23-9413-DBE68F53C9C9',
    tituloInforme: 'INFORME FITOPATOLÓGICO',
    tipoAnalisisDescripcion: 'Detección precoz de enfermedades en racimos.',
    metodologiaDescripcion: 'Metodología estándar para detección precoz.',
  },
  default: {
    key: 'default',
    label: 'Desconocido',
    initial: '?',
    bgColor: 'bg-gray-500',
    textColor: 'text-white',
    dbAreas: [],
    templateEnvVar: 'PDFMONKEY_TEMPLATE_DEFAULT',
    fallbackTemplateId: 'E7E87A76-10F7-4F3C-B45F-24BB7D06ED63',
    tituloInforme: 'INFORME DE ANÁLISIS',
    tipoAnalisisDescripcion: 'Análisis de laboratorio.',
    metodologiaDescripcion: 'Metodología estándar.',
  },
};

// ── Funciones helper ──

/** Resultado de getAnalysisTypeIndicator */
export interface AnalysisTypeIndicator {
  key: AnalysisType | string;
  initial: string;
  label: string;
  bgColor: string;
  textColor: string;
}

function indicatorFromEntry(entry: AnalysisTypeEntry): AnalysisTypeIndicator {
  return {
    key: entry.key,
    initial: entry.initial,
    label: entry.label,
    bgColor: entry.bgColor,
    textColor: entry.textColor,
  };
}

const UNKNOWN_INDICATOR: AnalysisTypeIndicator = {
  key: 'default',
  initial: '?',
  label: 'Desconocido',
  bgColor: 'bg-gray-500',
  textColor: 'text-white',
};

/**
 * Resuelve un AnalysisType desde la clave canónica (virology, phytopatology, …).
 */
export function getAnalysisTypeFromKey(
  analysisType: string | null | undefined
): AnalysisType {
  if (!analysisType) return 'default';

  const input = analysisType.toLowerCase().trim();
  if ((ANALYSIS_TYPE_KEYS as readonly string[]).includes(input)) {
    return input as AnalysisType;
  }

  return 'default';
}

/**
 * Resuelve el tipo de análisis a partir de un string de test_area.
 * Usa lookup explícito contra dbAreas de cada entrada del registro.
 * También acepta la clave canónica (virology, nematology, …).
 */
export function getAnalysisTypeFromTestArea(
  testArea: string | null | undefined
): AnalysisType {
  if (!testArea) return 'default';

  const input = testArea.toLowerCase().trim();

  const fromKey = getAnalysisTypeFromKey(input);
  if (fromKey !== 'default') return fromKey;

  for (const entry of Object.values(ANALYSIS_TYPE_REGISTRY)) {
    if (entry.dbAreas.some((area) => input === area)) {
      return entry.key;
    }
  }

  // Fallback: substring matching para valores no canónicos (ej. "virologia_positive")
  for (const entry of Object.values(ANALYSIS_TYPE_REGISTRY)) {
    if (entry.dbAreas.some((area) => input.includes(area))) {
      return entry.key;
    }
  }

  return 'default';
}

/**
 * Retorna TODOS los AnalysisType que matchean un testArea.
 * A diferencia de getAnalysisTypeFromTestArea() que devuelve solo el primero,
 * esta funcion permite detectar ambiguedad cuando hay multiples tipos para una misma area.
 */
export function getAllAnalysisTypesFromTestArea(
  testArea: string | null | undefined
): AnalysisType[] {
  if (!testArea) return ['default'];

  const input = testArea.toLowerCase().trim();
  const fromKey = getAnalysisTypeFromKey(input);
  if (fromKey !== 'default') return [fromKey];

  const matches: AnalysisType[] = [];

  for (const entry of Object.values(ANALYSIS_TYPE_REGISTRY)) {
    if (entry.dbAreas.some((area) => input === area || input.includes(area))) {
      matches.push(entry.key);
    }
  }

  return matches.length > 0 ? matches : ['default'];
}

/**
 * Convierte una etiqueta en español al valor de área en BD.
 * Reemplaza el mapping analysisTypeToArea en samples/route.ts.
 */
export function getDbAreaFromLabel(label: string): DbArea | null {
  for (const entry of Object.values(ANALYSIS_TYPE_REGISTRY)) {
    if (entry.label === label) {
      return entry.dbAreas[0] ?? null;
    }
  }
  return null;
}

/**
 * Convierte un valor de área de BD a su etiqueta en español.
 * Reemplaza el mapping areaMap en EditSampleModal.tsx.
 */
export function getLabelFromDbArea(area: DbArea): string {
  for (const entry of Object.values(ANALYSIS_TYPE_REGISTRY)) {
    if (entry.dbAreas.includes(area)) {
      return entry.label;
    }
  }
  return area; // fallback: devolver el valor tal cual
}

/**
 * Convierte una clave de AnalysisType a su etiqueta en español.
 */
export function getLabelFromAnalysisType(type: AnalysisType): string {
  return ANALYSIS_TYPE_REGISTRY[type]?.label ?? type;
}

/**
 * Retorna el indicador visual (color, inicial, etiqueta) para un informe.
 * Prioriza analysis_type (clave canónica) y cae a test_areas.
 */
export function getAnalysisTypeIndicator(
  testAreas: string[] | null | undefined,
  analysisType?: string | null
): AnalysisTypeIndicator {
  const fromKey = getAnalysisTypeFromKey(analysisType);
  if (fromKey !== 'default') {
    return indicatorFromEntry(ANALYSIS_TYPE_REGISTRY[fromKey]);
  }

  if (!testAreas || testAreas.length === 0) {
    return { ...UNKNOWN_INDICATOR };
  }

  for (const area of testAreas) {
    const type = getAnalysisTypeFromTestArea(area);
    if (type !== 'default') {
      return indicatorFromEntry(ANALYSIS_TYPE_REGISTRY[type]);
    }
  }

  return { ...UNKNOWN_INDICATOR, label: 'Otro' };
}

/**
 * Agrupa resultados por su tipo de análisis.
 * Reemplaza groupResultadosByAnalysisType en pdfmonkey/route.ts y CreateReportModal.tsx.
 *
 * La interfaz ResultadoDataLike acepta cualquier objeto con campo test_area.
 */
export interface ResultadoDataLike {
  test_area: string;
}

export function groupResultsByAnalysisType<T extends ResultadoDataLike>(
  resultados: T[]
): Map<AnalysisType, T[]> {
  const groups = new Map<AnalysisType, T[]>();

  for (const resultado of resultados) {
    const analysisType = getAnalysisTypeFromTestArea(resultado.test_area);

    if (!groups.has(analysisType)) {
      groups.set(analysisType, []);
    }

    groups.get(analysisType)!.push(resultado);
  }

  return groups;
}

/**
 * Obtiene el template ID de PDFMonkey para un tipo de análisis.
 * Prioriza variable de entorno, con fallback al ID hardcodeado.
 * SOLO PARA USO SERVER-SIDE (usa process.env).
 */
export function getTemplateId(type: AnalysisType): string {
  const entry = ANALYSIS_TYPE_REGISTRY[type];
  if (!entry) return ANALYSIS_TYPE_REGISTRY.default.fallbackTemplateId;

  if (typeof process !== 'undefined' && process.env) {
    const envValue = process.env[entry.templateEnvVar];
    if (envValue) return envValue;
  }

  return entry.fallbackTemplateId;
}

/**
 * Retorna los defaults de texto para un tipo de análisis.
 * Reemplaza el objeto ANALYSIS_DEFAULTS.
 */
export function getDefaultsForType(type: AnalysisType): {
  tituloInforme: string;
  tipoAnalisisDescripcion: string;
  metodologiaDescripcion: string;
} {
  const entry = ANALYSIS_TYPE_REGISTRY[type] ?? ANALYSIS_TYPE_REGISTRY.default;
  return {
    tituloInforme: entry.tituloInforme,
    tipoAnalisisDescripcion: entry.tipoAnalisisDescripcion,
    metodologiaDescripcion: entry.metodologiaDescripcion,
  };
}

/**
 * Retorna todas las etiquetas en español (para dropdowns de UI).
 */
export function getAllLabels(): string[] {
  return Object.values(ANALYSIS_TYPE_REGISTRY)
    .filter((e) => e.key !== 'default' && e.dbAreas.length > 0)
    .map((e) => e.label);
}

/**
 * Retorna opciones de filtro para dropdowns que usan DbArea como value.
 */
export function getAllAreaFilterOptions(): { value: DbArea; label: string }[] {
  return Object.values(ANALYSIS_TYPE_REGISTRY)
    .filter((e) => e.key !== 'default')
    .flatMap((e) => e.dbAreas.map((area) => ({ value: area, label: e.label })));
}
