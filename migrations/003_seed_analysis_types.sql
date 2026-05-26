-- 003: Inserta los 6 tipos de analisis canonicos desde el registro estatico.
-- Mantenido en sincronia manual con src/config/analysisTypes.ts (ANALYSIS_TYPE_REGISTRY).

INSERT INTO public.analysis_types (key, label, initial, bg_color, text_color, db_areas, pdfmonkey_template_id, template_env_var, titulo_informe, tipo_analisis_descripcion, metodologia_descripcion)
VALUES
(
  'virology',
  'Virológico',
  'V',
  'bg-indigo-600',
  'text-white',
  ARRAY['virologia'],
  '0D6C351F-BFFF-4FFF-8960-59763FA3018F',
  'PDFMONKEY_TEMPLATE_VIROLOGY',
  'INFORME VIROLÓGICO',
  'Determinación de virus fitopatógenos.',
  'Metodología estándar para análisis virológico.'
),
(
  'phytopatology',
  'Fitopatológico',
  'F',
  'bg-green-600',
  'text-white',
  ARRAY['fitopatologia'],
  '5AA9EEB6-73F7-4370-AF58-F932A541100B',
  'PDFMONKEY_TEMPLATE_PHYTOPATOLOGY',
  'INFORME FITOPATOLÓGICO',
  'Determinación de patógenos vegetales.',
  'Se efectuaron tres diluciones (10⁻¹, 10⁻² y 10⁻³) de cada muestra de suelo previamente tamizadas. Posteriormente se extrajo 1 ml de cada dilución, sembrándolas en placas de Petri con medios de cultivos específicos para el desarrollo de hongos. Después del período de incubación, se hizo el recuento del número de colonias presentes en las placas correspondientes a las tres diluciones de cada muestra de suelo. Los resultados se expresan en número de colonias de hongos por muestra analizada.'
),
(
  'bacteriology',
  'Bacteriológico',
  'B',
  'bg-blue-600',
  'text-white',
  ARRAY['bacteriologia'],
  'BFFA2B14-DA47-4D06-B593-0CC084D374C6',
  'PDFMONKEY_TEMPLATE_BACTERIOLOGY',
  'INFORME BACTERIOLÓGICO',
  'Determinación de bacterias fitopatógenas.',
  'Metodología estándar para análisis bacteriológico.'
),
(
  'nematology',
  'Nematológico',
  'N',
  'bg-purple-600',
  'text-white',
  ARRAY['nematologia'],
  '1D6880A8-BEDA-4538-86CA-4121557E88FE',
  'PDFMONKEY_TEMPLATE_NEMATOLOGY',
  'INFORME NEMATOLÓGICO',
  'Determinación de nematodos fitoparásitos de formas móviles y enquistadas en suelo.',
  'Para la determinación de nematodos fitoparásitos en formas móviles se utilizó el Método de Tamizado de Cobb y Embudo de Baermann.'
),
(
  'early_detection',
  'Detección Precoz',
  'DP',
  'bg-yellow-600',
  'text-white',
  ARRAY['deteccion_precoz'],
  '6AD1FA7C-65EE-4E23-9413-DBE68F53C9C9',
  'PDFMONKEY_TEMPLATE_EARLY_DETECTION',
  'INFORME FITOPATOLÓGICO',
  'Detección precoz de enfermedades en racimos.',
  'Metodología estándar para detección precoz.'
),
(
  'default',
  'Desconocido',
  '?',
  'bg-gray-500',
  'text-white',
  ARRAY[]::text[],
  'E7E87A76-10F7-4F3C-B45F-24BB7D06ED63',
  'PDFMONKEY_TEMPLATE_DEFAULT',
  'INFORME DE ANÁLISIS',
  'Análisis de laboratorio.',
  'Metodología estándar.'
);
