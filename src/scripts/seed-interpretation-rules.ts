/**
 * Seed Interpretation Rules
 * 
 * This script creates example interpretation rules for the LIMS system.
 * These rules provide automated interpretation of test results.
 * 
 * Usage:
 * - Set SUPABASE environment variables
 * - Run: npx tsx src/scripts/seed-interpretation-rules.ts
 */

import { createClient } from '@supabase/supabase-js'
import { InterpretationService } from '../lib/services/interpretationService'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedInterpretationRules() {
  console.log('🌱 Seeding interpretation rules...')
  
  try {
    // Clear existing rules first
    console.log('🧹 Clearing existing interpretation rules...')
    await supabase.from('interpretation_rules').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    const interpretationService = new InterpretationService()
    
    // Nematology Rules
    const nematologyRules = [
      {
        area: 'nematologia' as const,
        analyte: 'Meloidogyne',
        comparator: '>' as const,
        threshold_json: { value: 100 },
        message: 'Alta población de nematodos del nudo (Meloidogyne spp.) detectada: {value} individuos en {unit_label}. Se recomienda implementar rotación de cultivos con plantas no hospederas y considerar tratamiento nematicida.',
        severity: 'high' as const
      },
      {
        area: 'nematologia' as const,
        analyte: 'Meloidogyne',
        comparator: '>=' as const,
        threshold_json: { value: 50 },
        message: 'Población moderada de Meloidogyne spp. detectada: {value} individuos en {unit_label}. Monitorear desarrollo del cultivo y considerar medidas preventivas.',
        severity: 'moderate' as const
      },
      {
        area: 'nematologia' as const,
        analyte: 'Heterodera',
        comparator: '>' as const,
        threshold_json: { value: 30 },
        message: 'Presencia significativa de nematodos quiste (Heterodera spp.): {value} quistes/100g de suelo en {unit_label}. Puede afectar significativamente el rendimiento.',
        severity: 'high' as const
      },
      {
        area: 'nematologia' as const,
        analyte: 'Pratylenchus',
        comparator: '>' as const,
        threshold_json: { value: 200 },
        message: 'Alta densidad de nematodos lesionadores (Pratylenchus spp.): {value} individuos en {unit_label}. Riesgo de daño radicular severo.',
        severity: 'high' as const
      },
      {
        area: 'nematologia' as const,
        analyte: 'Tylenchulus',
        comparator: '>=' as const,
        threshold_json: { value: 100 },
        message: 'Población de nematodos de los cítricos (Tylenchulus semipenetrans) detectada: {value} individuos en {unit_label}. Monitorear salud radicular.',
        severity: 'moderate' as const
      }
    ]
    
    // Virology Rules
    const virologyRules = [
      {
        area: 'virologia' as const,
        analyte: 'PNRSV',
        comparator: '=' as const,
        threshold_json: { flag: 'positivo' },
        message: 'Detección POSITIVA de Virus del Anillado Necrótico de los Frutales de Carozo (PNRSV) en {unit_label}. IMPLEMENTAR INMEDIATAMENTE medidas de cuarentena y evitar propagación vegetativa.',
        severity: 'high' as const
      },
      {
        area: 'virologia' as const,
        analyte: 'ApMV',
        comparator: '=' as const,
        threshold_json: { flag: 'positivo' },
        message: 'Detección POSITIVA de Virus del Mosaico del Manzano (ApMV) en {unit_label}. Eliminar material infectado y desinfectar herramientas.',
        severity: 'high' as const
      },
      {
        area: 'virologia' as const,
        analyte: 'ACLSV',
        comparator: '=' as const,
        threshold_json: { flag: 'positivo' },
        message: 'Detección POSITIVA de Virus de la Hoja Clorótica del Manzano (ACLSV) en {unit_label}. Evaluar sintomatología y considerar eliminación de plantas afectadas.',
        severity: 'moderate' as const
      },
      {
        area: 'virologia' as const,
        analyte: 'PDV',
        comparator: '=' as const,
        threshold_json: { flag: 'positivo' },
        message: 'Detección POSITIVA de Virus de la Decadencia del Peral (PDV) en {unit_label}. Implementar medidas de control vectorial y sanitización.',
        severity: 'high' as const
      }
    ]
    
    // Phytopathology Rules
    const phytopathologyRules = [
      {
        area: 'fitopatologia' as const,
        analyte: 'Fusarium',
        comparator: '>' as const,
        threshold_json: { value: 1000 },
        message: 'Alta carga fúngica de Fusarium spp. detectada: {value} UFC/g en {unit_label}. ALTO RIESGO de marchitez vascular. Implementar drenaje y evitar exceso de humedad.',
        severity: 'high' as const
      },
      {
        area: 'fitopatologia' as const,
        analyte: 'Fusarium',
        comparator: '>=' as const,
        threshold_json: { value: 500 },
        message: 'Presencia moderada de Fusarium spp.: {value} UFC/g en {unit_label}. Monitorear síntomas de marchitez y aplicar medidas preventivas.',
        severity: 'moderate' as const
      },
      {
        area: 'fitopatologia' as const,
        analyte: 'Botrytis',
        comparator: '=' as const,
        threshold_json: { flag: 'positivo' },
        message: 'Presencia de Botrytis cinerea confirmada en {unit_label}. Mejorar ventilación, reducir humedad relativa y considerar aplicación fungicida preventiva.',
        severity: 'moderate' as const
      },
      {
        area: 'fitopatologia' as const,
        analyte: 'Pythium',
        comparator: '>' as const,
        threshold_json: { value: 100 },
        message: 'Alta concentración de Pythium spp.: {value} UFC/g en {unit_label}. Riesgo de pudrición radicular. Mejorar drenaje urgentemente.',
        severity: 'high' as const
      },
      {
        area: 'fitopatologia' as const,
        analyte: 'Rhizoctonia',
        comparator: '>=' as const,
        threshold_json: { value: 50 },
        message: 'Presencia de Rhizoctonia solani detectada: {value} UFC/g en {unit_label}. Riesgo de damping-off en plántulas. Usar sustratos estériles.',
        severity: 'moderate' as const
      },
      {
        area: 'fitopatologia' as const,
        analyte: 'Sclerotinia',
        comparator: '=' as const,
        threshold_json: { flag: 'positivo' },
        message: 'Sclerotinia sclerotiorum detectada en {unit_label}. Eliminar restos vegetales infectados y mejorar circulación de aire.',
        severity: 'moderate' as const
      }
    ]
    
    // Early Detection Rules
    const earlyDetectionRules = [
      {
        area: 'deteccion_precoz' as const,
        analyte: 'Botrytis',
        comparator: '=' as const,
        threshold_json: { flag: 'positivo' },
        message: 'DETECCIÓN PRECOZ: Botrytis cinerea detectada en {unit_label}. Intervenir INMEDIATAMENTE antes de la aparición de síntomas visibles.',
        severity: 'high' as const
      },
      {
        area: 'deteccion_precoz' as const,
        analyte: 'Alternaria',
        comparator: '=' as const,
        threshold_json: { flag: 'positivo' },
        message: 'DETECCIÓN PRECOZ: Alternaria spp. identificada en {unit_label}. Aplicar fungicida preventivo y monitorear condiciones climáticas.',
        severity: 'moderate' as const
      }
    ]
    
    // Crop-specific rules
    const cropSpecificRules = [
      {
        area: 'nematologia' as const,
        species: 'Tomate',
        analyte: 'Meloidogyne',
        comparator: '>' as const,
        threshold_json: { value: 50 },
        message: 'En TOMATE: Población crítica de Meloidogyne spp. ({value} individuos). En este cultivo susceptible, implementar inmediatamente solarización del suelo o biofumigación.',
        severity: 'high' as const
      },
      {
        area: 'fitopatologia' as const,
        species: 'Papa',
        crop_next: 'Papa',
        analyte: 'Fusarium',
        comparator: '>' as const,
        threshold_json: { value: 200 },
        message: 'CRÍTICO para rotación PAPA-PAPA: Alta carga de Fusarium ({value} UFC/g). Cambiar plan de rotación - evitar papa por al menos 3 años.',
        severity: 'high' as const
      }
    ]
    
    // Combine all rules
    const allRules = [
      ...nematologyRules,
      ...virologyRules,
      ...phytopathologyRules,
      ...earlyDetectionRules,
      ...cropSpecificRules
    ]
    
    console.log(`📝 Creating ${allRules.length} interpretation rules...`)
    
    let created = 0
    let errors = 0
    
    for (const rule of allRules) {
      try {
        // Add default values for required fields
        const completeRule = {
          ...rule,
          species: ('species' in rule ? rule.species : null),
          crop_next: ('crop_next' in rule ? rule.crop_next : null),
          threshold_json: Object.fromEntries(
            Object.entries(rule.threshold_json).filter(([, value]) => value !== undefined)
          ),
          active: true,
          vertical_id: null
        }
        
        const result = await interpretationService.createRule(completeRule)
        if (result) {
          created++
        } else {
          errors++
        }
      } catch (error) {
        console.error(`Error creating rule for ${rule.analyte}:`, error)
        errors++
      }
    }
    
    console.log(`✅ Created ${created} interpretation rules`)
    if (errors > 0) {
      console.log(`⚠️  ${errors} errors encountered`)
    }
    
    // Verify creation
    const { count } = await supabase
      .from('interpretation_rules')
      .select('id', { count: 'exact' })
      .eq('active', true)
    
    console.log(`📊 Total active interpretation rules in database: ${count}`)
    
  } catch (error) {
    console.error('❌ Error seeding interpretation rules:', error)
    process.exit(1)
  }
}

async function listRulesByArea() {
  console.log('\n📋 Rules by area:')
  
  const areas = ['nematologia', 'virologia', 'fitopatologia', 'deteccion_precoz']
  
  for (const area of areas) {
    const { data, count } = await supabase
      .from('interpretation_rules')
      .select('analyte, severity', { count: 'exact' })
      .eq('area', area)
      .eq('active', true)
    
    console.log(`\n${area.toUpperCase()}: ${count} rules`)
    if (data) {
      const severityCounts = data.reduce((acc, rule) => {
        acc[rule.severity] = (acc[rule.severity] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      console.log(`   High: ${severityCounts.high || 0}, Moderate: ${severityCounts.moderate || 0}, Low: ${severityCounts.low || 0}`)
      
      const analytes = [...new Set(data.map(r => r.analyte))]
      console.log(`   Analytes: ${analytes.join(', ')}`)
    }
  }
}

// Main execution
if (require.main === module) {
  seedInterpretationRules()
    .then(() => listRulesByArea())
    .then(() => {
      console.log('\n🎉 Interpretation rules seeded successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error)
      process.exit(1)
    })
}

export { seedInterpretationRules }