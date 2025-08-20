/**
 * Data Migration Script
 * 
 * This script migrates legacy data from the old schema to the new normalized structure.
 * Run this after applying all database migrations.
 * 
 * Usage:
 * - Set DATABASE_URL environment variable
 * - Run: npx tsx src/scripts/migrate-legacy-data.ts
 */

import { createClient } from '@supabase/supabase-js'
import { SLAService } from '../lib/services/slaService'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const slaService = new SLAService()

interface LegacySample {
  id: string
  priority: 'normal' | 'express'
  received_date: string
  created_at: string
  requested_tests?: string[]
}

async function migrateLegacyData() {
  console.log('🚀 Starting data migration...')
  
  try {
    // Step 1: Map legacy priority to sla_type
    await migrateSLATypes()
    
    // Step 2: Set received_at for existing samples without it
    await migrateReceivedAt()
    
    // Step 3: Calculate and set due_date for all samples
    await migrateDueDates()
    
    // Step 4: Migrate requested_tests array to sample_tests table
    await migrateRequestedTests()
    
    // Step 5: Create default sample units for samples without them
    await createDefaultSampleUnits()
    
    // Step 6: Update SLA statuses
    await updateSLAStatuses()
    
    console.log('✅ Data migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

async function migrateSLATypes() {
  console.log('📝 Step 1: Migrating priority to sla_type...')
  
  const { data: samples, error } = await supabase
    .from('samples')
    .select('id, priority')
    .is('sla_type', null)
  
  if (error) throw error
  
  if (!samples || samples.length === 0) {
    console.log('   No samples to migrate for sla_type')
    return
  }
  
  let updated = 0
  for (const sample of samples) {
    const slaType = sample.priority === 'express' ? 'express' : 'normal'
    
    const { error: updateError } = await supabase
      .from('samples')
      .update({ sla_type: slaType })
      .eq('id', sample.id)
    
    if (updateError) {
      console.error(`   Error updating sample ${sample.id}:`, updateError)
    } else {
      updated++
    }
  }
  
  console.log(`   ✅ Updated sla_type for ${updated} samples`)
}

async function migrateReceivedAt() {
  console.log('📝 Step 2: Setting received_at from received_date...')
  
  const { data: samples, error } = await supabase
    .from('samples')
    .select('id, received_date, created_at')
    .is('received_at', null)
  
  if (error) throw error
  
  if (!samples || samples.length === 0) {
    console.log('   No samples to migrate for received_at')
    return
  }
  
  let updated = 0
  for (const sample of samples) {
    // Use received_date if available, otherwise use created_at
    const receivedAt = sample.received_date 
      ? new Date(sample.received_date).toISOString()
      : new Date(sample.created_at).toISOString()
    
    const { error: updateError } = await supabase
      .from('samples')
      .update({ received_at: receivedAt })
      .eq('id', sample.id)
    
    if (updateError) {
      console.error(`   Error updating sample ${sample.id}:`, updateError)
    } else {
      updated++
    }
  }
  
  console.log(`   ✅ Updated received_at for ${updated} samples`)
}

async function migrateDueDates() {
  console.log('📝 Step 3: Calculating due dates...')
  
  const { data: samples, error } = await supabase
    .from('samples')
    .select('id, received_at, sla_type')
    .is('due_date', null)
    .not('received_at', 'is', null)
  
  if (error) throw error
  
  if (!samples || samples.length === 0) {
    console.log('   No samples to migrate for due_date')
    return
  }
  
  let updated = 0
  for (const sample of samples) {
    const receivedAt = new Date(sample.received_at)
    const slaType = sample.sla_type as 'normal' | 'express'
    const dueDate = slaService.computeDueDate(receivedAt, slaType)
    
    const { error: updateError } = await supabase
      .from('samples')
      .update({ due_date: dueDate.toISOString().split('T')[0] })
      .eq('id', sample.id)
    
    if (updateError) {
      console.error(`   Error updating sample ${sample.id}:`, updateError)
    } else {
      updated++
    }
  }
  
  console.log(`   ✅ Updated due_date for ${updated} samples`)
}

async function migrateRequestedTests() {
  console.log('📝 Step 4: Migrating requested_tests array to sample_tests...')
  
  // Get samples with requested_tests array
  const { data: samples, error } = await supabase
    .from('samples')
    .select('id, requested_tests')
    .not('requested_tests', 'is', null)
  
  if (error) throw error
  
  if (!samples || samples.length === 0) {
    console.log('   No samples with requested_tests to migrate')
    return
  }
  
  // Get available tests for mapping
  const { data: tests } = await supabase
    .from('test_catalog')
    .select('id, code, name')
  
  const testMap = new Map(tests?.map(t => [t.code.toLowerCase(), t.id]))
  
  // Add common test name mappings
  const testMappings: Record<string, string> = {
    'visual inspection': 'VISUAL_INSP',
    'cultural isolation': 'CULTIVO',
    'molecular pcr': 'PCR',
    'pathogenicity test': 'PATOGENICIDAD',
    'elisa': 'ELISA',
    'microscopy': 'MICROSCOPIO',
    'biochemical tests': 'BIOQUIMICO',
    'sequencing': 'SECUENCIACION',
    'serology': 'SEROLOGIA',
    'immunofluorescence': 'INMUNOFLUOR'
  }
  
  let migratedSamples = 0
  let migratedTests = 0
  
  for (const sample of samples) {
    if (!sample.requested_tests || !Array.isArray(sample.requested_tests)) {
      continue
    }
    
    const sampleTestInserts = []
    
    for (const testName of sample.requested_tests) {
      let testId: number | null = null
      
      // Try direct mapping by code
      testId = testMap.get(testName.toLowerCase()) || null
      
      // Try mapping by common name
      if (!testId && testMappings[testName.toLowerCase()]) {
        testId = testMap.get(testMappings[testName.toLowerCase()].toLowerCase()) || null
      }
      
      // Try partial matching
      if (!testId) {
        for (const [code, id] of testMap) {
          if (code.includes(testName.toLowerCase()) || testName.toLowerCase().includes(code)) {
            testId = id
            break
          }
        }
      }
      
      if (testId) {
        sampleTestInserts.push({
          sample_id: sample.id,
          test_id: testId
        })
      } else {
        console.log(`   ⚠️  Could not map test: "${testName}" for sample ${sample.id}`)
      }
    }
    
    // Insert sample tests
    if (sampleTestInserts.length > 0) {
      const { error: insertError } = await supabase
        .from('sample_tests')
        .insert(sampleTestInserts)
      
      if (insertError) {
        console.error(`   Error inserting tests for sample ${sample.id}:`, insertError)
      } else {
        migratedTests += sampleTestInserts.length
        migratedSamples++
      }
    }
  }
  
  console.log(`   ✅ Migrated ${migratedTests} tests for ${migratedSamples} samples`)
}

async function createDefaultSampleUnits() {
  console.log('📝 Step 5: Creating default sample units...')
  
  // Get samples without sample units
  const { data: samplesWithoutUnits, error } = await supabase
    .from('samples')
    .select(`
      id,
      code,
      sample_units (id)
    `)
  
  if (error) throw error
  
  const samplesToProcess = samplesWithoutUnits?.filter(
    s => !s.sample_units || s.sample_units.length === 0
  ) || []
  
  if (samplesToProcess.length === 0) {
    console.log('   No samples need default units')
    return
  }
  
  let created = 0
  for (const sample of samplesToProcess) {
    const { error: insertError } = await supabase
      .from('sample_units')
      .insert({
        sample_id: sample.id,
        code: '1',
        label: 'Muestra Principal'
      })
    
    if (insertError) {
      console.error(`   Error creating unit for sample ${sample.id}:`, insertError)
    } else {
      created++
    }
  }
  
  console.log(`   ✅ Created default units for ${created} samples`)
}

async function updateSLAStatuses() {
  console.log('📝 Step 6: Updating SLA statuses...')
  
  const result = await slaService.updateAllSLAStatuses()
  
  console.log(`   ✅ Updated SLA status for ${result.updated} samples (${result.errors} errors)`)
}

// Verification functions
async function verifyMigration() {
  console.log('🔍 Verifying migration...')
  
  const results = await Promise.all([
    // Check samples have sla_type
    supabase
      .from('samples')
      .select('id')
      .is('sla_type', null),
    
    // Check samples have received_at
    supabase
      .from('samples')
      .select('id')
      .is('received_at', null),
    
    // Check samples have due_date
    supabase
      .from('samples')
      .select('id')
      .is('due_date', null),
    
    // Count sample_tests
    supabase
      .from('sample_tests')
      .select('id', { count: 'exact' }),
    
    // Count sample_units
    supabase
      .from('sample_units')
      .select('id', { count: 'exact' })
  ])
  
  const [
    missingSlaType,
    missingReceivedAt,
    missingDueDate,
    sampleTests,
    sampleUnits
  ] = results
  
  console.log('📊 Migration verification results:')
  console.log(`   Samples missing sla_type: ${missingSlaType.data?.length || 0}`)
  console.log(`   Samples missing received_at: ${missingReceivedAt.data?.length || 0}`)
  console.log(`   Samples missing due_date: ${missingDueDate.data?.length || 0}`)
  console.log(`   Total sample_tests: ${sampleTests.count || 0}`)
  console.log(`   Total sample_units: ${sampleUnits.count || 0}`)
  
  const hasIssues = (missingSlaType.data?.length || 0) > 0 ||
                   (missingReceivedAt.data?.length || 0) > 0 ||
                   (missingDueDate.data?.length || 0) > 0
  
  if (hasIssues) {
    console.log('⚠️  Some issues found - you may need to run the migration again')
  } else {
    console.log('✅ All checks passed!')
  }
}

// Main execution
if (require.main === module) {
  migrateLegacyData()
    .then(() => verifyMigration())
    .then(() => {
      console.log('🎉 Migration process completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error)
      process.exit(1)
    })
}

export { migrateLegacyData, verifyMigration }