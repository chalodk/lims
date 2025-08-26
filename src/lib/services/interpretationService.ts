import { createClient } from '@/lib/supabase/client'
import type { 
  InterpretationRule, 
  AppliedInterpretation, 
  UnitResult,
  SampleFull
} from '@/types/database'

interface ThresholdConfig {
  value?: number
  flag?: string
  values?: unknown[]
}

export class InterpretationService {
  private supabase = createClient()

  /**
   * Evaluate all interpretation rules for a sample and apply matching ones
   */
  async evaluateAndApplyRules(sampleId: string): Promise<AppliedInterpretation[]> {
    try {
      // Get sample data with results
      const { data: sample, error: sampleError } = await this.supabase
        .from('samples')
        .select(`
          *,
          sample_units (
            *,
            unit_results (
              *,
              test_catalog (area)
            )
          )
        `)
        .eq('id', sampleId)
        .single()

      if (sampleError || !sample) {
        console.error('Error fetching sample:', sampleError)
        return []
      }

      // Get all active interpretation rules
      const { data: rules, error: rulesError } = await this.supabase
        .from('interpretation_rules')
        .select('*')
        .eq('active', true)

      if (rulesError || !rules) {
        console.error('Error fetching interpretation rules:', rulesError)
        return []
      }

      // Clear existing interpretations for this sample
      await this.supabase
        .from('applied_interpretations')
        .delete()
        .eq('sample_id', sampleId)

      const appliedInterpretations: AppliedInterpretation[] = []

      // Evaluate each rule
      for (const rule of rules) {
        const matches = await this.evaluateRule(rule, sample)
        
        for (const match of matches) {
          const { data: applied, error: applyError } = await this.supabase
            .from('applied_interpretations')
            .insert({
              sample_id: sampleId,
              rule_id: rule.id,
              message: match.message,
              severity: rule.severity
            })
            .select()
            .single()

          if (!applyError && applied) {
            appliedInterpretations.push(applied)
          }
        }
      }

      return appliedInterpretations
    } catch (error) {
      console.error('Error evaluating interpretation rules:', error)
      return []
    }
  }

  /**
   * Evaluate a single rule against sample data
   */
  private async evaluateRule(
    rule: InterpretationRule, 
    sample: SampleFull
  ): Promise<{ message: string }[]> {
    const matches: { message: string }[] = []

    // Filter by area if specified
    if (rule.area) {
      const hasAreaResults = sample.sample_units?.some((unit) =>
        unit.unit_results?.some((result) => 
          result.test_catalog?.area === rule.area
        )
      )
      
      if (!hasAreaResults) {
        return matches
      }
    }

    // Filter by species if specified
    if (rule.species && sample.species !== rule.species) {
      return matches
    }

    // Filter by next crop if specified
    if (rule.crop_next && sample.next_crop !== rule.crop_next) {
      return matches
    }

    // Evaluate analyte conditions
    const relevantResults = this.getRelevantResults(sample, rule)
    
    for (const result of relevantResults) {
      if (this.evaluateAnalyteCondition(result, rule)) {
        // Customize message with actual values
        const customizedMessage = this.customizeMessage(rule.message, result, sample)
        matches.push({ message: customizedMessage })
      }
    }

    return matches
  }

  /**
   * Get results relevant to the rule
   */
  private getRelevantResults(sample: SampleFull, rule: InterpretationRule): (UnitResult & { unit?: { code?: string; label?: string } })[] {
    const results: (UnitResult & { unit?: { code?: string; label?: string } })[] = []

    if (!sample.sample_units) return results

    for (const unit of sample.sample_units) {
      if (!unit.unit_results) continue

      for (const result of unit.unit_results) {
        // Match by analyte name (case insensitive)
        if (result.analyte && 
            result.analyte.toLowerCase().includes(rule.analyte.toLowerCase())) {
          results.push({ 
            ...result, 
            unit: { 
              code: unit.code || undefined, 
              label: unit.label || undefined 
            } 
          })
        }
      }
    }

    return results
  }

  /**
   * Evaluate if a result meets the rule condition
   */
  private evaluateAnalyteCondition(result: UnitResult, rule: InterpretationRule): boolean {
    const threshold = rule.threshold_json as ThresholdConfig
    
    switch (rule.comparator) {
      case '>':
        return result.result_value !== null && 
               result.result_value !== undefined &&
               typeof result.result_value === 'number' &&
               typeof threshold.value === 'number' &&
               result.result_value > threshold.value
      
      case '>=':
        return result.result_value !== null && 
               result.result_value !== undefined &&
               typeof result.result_value === 'number' &&
               typeof threshold.value === 'number' &&
               result.result_value >= threshold.value
      
      case '=':
        if (threshold.value !== undefined) {
          return result.result_value === threshold.value
        }
        if (threshold.flag) {
          return result.result_flag === threshold.flag
        }
        return false
      
      case 'in':
        if (threshold.values && Array.isArray(threshold.values)) {
          return threshold.values.includes(result.result_value) ||
                 threshold.values.includes(result.result_flag) ||
                 threshold.values.includes(result.analyte)
        }
        return false
      
      default:
        return false
    }
  }

  /**
   * Customize interpretation message with actual result values
   */
  private customizeMessage(template: string, result: UnitResult & { unit?: { code?: string; label?: string } }, sample: SampleFull): string {
    let message = template

    // Replace placeholders with actual values
    const replacements: Record<string, string> = {
      '{analyte}': result.analyte || 'N/A',
      '{value}': result.result_value?.toString() || 'N/A',
      '{flag}': result.result_flag || 'N/A',
      '{unit_code}': result.unit?.code || 'N/A',
      '{unit_label}': result.unit?.label || 'N/A',
      '{species}': sample.species || 'N/A',
      '{variety}': sample.variety || 'N/A',
      '{sample_code}': sample.code || 'N/A'
    }

    for (const [placeholder, value] of Object.entries(replacements)) {
      message = message.replace(new RegExp(placeholder, 'g'), value)
    }

    return message
  }

  /**
   * Create or update an interpretation rule
   */
  async createRule(ruleData: Omit<InterpretationRule, 'id' | 'created_at'>): Promise<InterpretationRule | null> {
    try {
      const { data, error } = await this.supabase
        .from('interpretation_rules')
        .insert(ruleData)
        .select()
        .single()

      if (error) {
        console.error('Error creating interpretation rule:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error creating interpretation rule:', error)
      return null
    }
  }

  /**
   * Get interpretation rules for management
   */
  async getRules(filters?: {
    area?: string
    active?: boolean
  }): Promise<InterpretationRule[]> {
    try {
      let query = this.supabase
        .from('interpretation_rules')
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.area) {
        query = query.eq('area', filters.area)
      }

      if (filters?.active !== undefined) {
        query = query.eq('active', filters.active)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching interpretation rules:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching interpretation rules:', error)
      return []
    }
  }

  /**
   * Deactivate a rule
   */
  async deactivateRule(ruleId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('interpretation_rules')
        .update({ active: false })
        .eq('id', ruleId)

      return !error
    } catch (error) {
      console.error('Error deactivating interpretation rule:', error)
      return false
    }
  }

  /**
   * Get applied interpretations for a sample
   */
  async getAppliedInterpretations(sampleId: string): Promise<AppliedInterpretation[]> {
    try {
      const { data, error } = await this.supabase
        .from('applied_interpretations')
        .select(`
          *,
          interpretation_rules (*)
        `)
        .eq('sample_id', sampleId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching applied interpretations:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching applied interpretations:', error)
      return []
    }
  }

  /**
   * Example rules for different areas
   */
  static getExampleRules(): Partial<InterpretationRule>[] {
    return [
      // Nematology rules
      {
        area: 'nematologia',
        analyte: 'Meloidogyne',
        comparator: '>',
        threshold_json: { value: 100 },
        message: 'Se detectó alta población de {analyte} ({value} individuos) en {unit_label}. Se recomienda tratamiento nematicida.',
        severity: 'high'
      },
      {
        area: 'nematologia',
        analyte: 'Heterodera',
        comparator: '>',
        threshold_json: { value: 50 },
        message: 'Presencia significativa de {analyte} ({value} quistes) puede afectar el rendimiento del cultivo.',
        severity: 'moderate'
      },

      // Virology rules
      {
        area: 'virologia',
        analyte: 'PNRSV',
        comparator: '=',
        threshold_json: { flag: 'positivo' },
        message: 'Detección positiva de {analyte} en {unit_label}. Implementar medidas de cuarentena.',
        severity: 'high'
      },

      // Phytopathology rules
      {
        area: 'fitopatologia',
        analyte: 'Fusarium',
        comparator: '>',
        threshold_json: { value: 1000 },
        message: 'Alta carga de {analyte} ({value} UFC/g) detectada. Riesgo de marchitez vascular.',
        severity: 'high'
      },
      {
        area: 'fitopatologia',
        analyte: 'Botrytis',
        comparator: '=',
        threshold_json: { flag: 'positivo' },
        message: 'Presencia de {analyte} confirmada. Monitorear condiciones de humedad.',
        severity: 'moderate'
      }
    ]
  }
}