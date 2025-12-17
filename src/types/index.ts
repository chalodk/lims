export interface User {
  id: string
  company_id: string | null
  client_id: string | null
  role_id: number
  name: string
  email: string
  specialization?: string
  avatar?: string
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  name: string
  created_at: string
}

export interface Client {
  id: string
  company_id: string
  name: string
  rut?: string
  contact_email?: string
  phone?: string
  address?: string
  client_type?: 'farmer' | 'agricultural_company' | 'research_institution' | 'government_agency' | 'consultant'
  created_at: string
}

export interface Role {
  id: number
  name: 'admin' | 'validador' | 'comun' | 'consumidor'
  level: number
  description: string
  created_at: string
}

export interface View {
  id: number
  name: string
  label: string
  path: string
  created_at: string
}

export interface Sample {
  id: string
  client_id: string
  company_id: string
  code: string
  received_date: string
  registered_date: string
  priority: 'normal' | 'express' | 'urgent'
  species: string
  variety?: string
  rootstock?: string
  planting_year?: number
  previous_crop?: string
  next_crop?: string
  fallow: boolean
  tissue_type: 'leaf' | 'stem' | 'root' | 'fruit' | 'seed' | 'soil' | 'whole_plant' | 'other'
  symptoms?: string
  collection_location?: string
  environmental_conditions?: string
  client_notes?: string
  reception_notes?: string
  taken_by: 'client' | 'lab'
  sampling_method?: string
  suspected_pathogen?: string
  requested_tests: string[]
  status: 'received' | 'processing' | 'microscopy' | 'isolation' | 'identification' | 'molecular_analysis' | 'validation' | 'completed'
  assigned_to?: string
  images?: string[]
  created_at: string
  updated_at: string
}

export interface Report {
  id: string
  sample_id: string
  client_id: string
  company_id: string
  delivery_date?: string
  template: 'standard' | 'regulatory' | 'summary' | 'detailed'
  generated_by?: string
  completed: boolean
  responsible_id?: string
  status: 'draft' | 'generated' | 'sent'
  include_recommendations: boolean
  include_images: boolean
  download_url?: string
  created_at: string
  updated_at: string
}

export interface Result {
  id: string
  sample_id: string
  test_type: 'Visual Inspection' | 'Cultural Isolation' | 'Molecular PCR' | 'Pathogenicity Test' | 'ELISA' | 'Microscopy' | 'Biochemical Tests' | 'Sequencing' | 'Serology' | 'Immunofluorescence'
  methodology: string
  findings?: Record<string, unknown>
  conclusion?: string
  diagnosis?: string
  pathogen_identified?: string
  pathogen_type?: 'fungus' | 'bacteria' | 'virus' | 'nematode' | 'insect' | 'abiotic' | 'unknown'
  severity?: 'low' | 'moderate' | 'high' | 'severe'
  confidence?: 'low' | 'medium' | 'high'
  result_type?: 'positive' | 'negative'
  is_pathogen_present?: boolean
  microscopic_observations?: string
  cultural_characteristics?: string
  molecular_results?: string
  recommendations?: string
  images?: string[]
  comments?: string
  performed_by?: string
  performed_at?: string
  validated_by?: string
  validation_date?: string
  status: 'pending' | 'completed' | 'validated'
  created_at: string
  updated_at: string
}

export interface ActionzLog {
  id: number
  user_id?: string
  company_id?: string
  action: string
  target_table?: string
  target_id?: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface SampleAuditLog {
  id: number
  sample_id: string
  user_id?: string
  action: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  created_at: string
} 