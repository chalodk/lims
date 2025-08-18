import { createClient } from '@/lib/supabase/client'

export const checkSamplesSchema = async () => {
  const supabase = createClient()
  
  try {
    // Try to get schema information
    const { data, error } = await supabase
      .from('samples')
      .select('*')
      .limit(1)
      
    if (error) {
      console.error('Error checking schema:', error)
      return null
    }
    
    if (data && data.length > 0) {
      console.log('Sample record structure:', Object.keys(data[0]))
      return Object.keys(data[0])
    } else {
      console.log('No samples found, checking information_schema')
      
      // Alternative: try to query column information
      const { data: columnData, error: columnError } = await supabase.rpc('get_columns', { 
        table_name: 'samples' 
      })
      
      if (columnError) {
        console.log('RPC not available, will proceed with expected schema')
      }
      
      return columnData
    }
  } catch (error) {
    console.error('Schema check error:', error)
    return null
  }
}