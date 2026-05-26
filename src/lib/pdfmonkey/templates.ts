/**
 * Utilidades server-side para resolucion de templates PDFMonkey.
 * NO importar en componentes cliente — usa next/headers via @/lib/supabase/server.
 */
import 'server-only'
import { type AnalysisType, ANALYSIS_TYPE_REGISTRY } from '@/config/analysisTypes'
import { createClient } from '@/lib/supabase/server'

/**
 * Resuelve el template ID de PDFMonkey con la cadena de prioridad completa:
 * 1. Company-specific (company_analysis_type_templates)
 * 2. Global en BD (analysis_types.pdfmonkey_template_id)
 * 3. Variable de entorno (PDFMONKEY_TEMPLATE_XXX)
 * 4. Hardcoded fallback (ANALYSIS_TYPE_REGISTRY)
 */
export async function resolveTemplateId(
  analysisType: AnalysisType,
  companyId: string | null
): Promise<string> {
  const entry = ANALYSIS_TYPE_REGISTRY[analysisType]
  if (!entry) return ANALYSIS_TYPE_REGISTRY.default.fallbackTemplateId

  const supabase = await createClient()

  // 1. Company-specific override
  if (companyId) {
    const { data: companyTemplate } = await supabase
      .from('company_analysis_type_templates')
      .select('pdfmonkey_template_id')
      .eq('company_id', companyId)
      .eq('analysis_type_key', analysisType)
      .maybeSingle()

    if (companyTemplate?.pdfmonkey_template_id) {
      return companyTemplate.pdfmonkey_template_id
    }
  }

  // 2. Global DB override
  const { data: globalType } = await supabase
    .from('analysis_types')
    .select('pdfmonkey_template_id')
    .eq('key', analysisType)
    .maybeSingle()

  if (globalType?.pdfmonkey_template_id) {
    return globalType.pdfmonkey_template_id
  }

  // 3. Environment variable
  if (typeof process !== 'undefined' && process.env) {
    const envValue = process.env[entry.templateEnvVar]
    if (envValue) return envValue
  }

  // 4. Hardcoded fallback
  return entry.fallbackTemplateId
}
