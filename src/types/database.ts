// Database types generated from schema
export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      roles: {
        Row: {
          id: number
          name: 'admin' | 'validador' | 'comun' | 'consumidor'
          level: number
          description: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name: 'admin' | 'validador' | 'comun' | 'consumidor'
          level: number
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          name?: 'admin' | 'validador' | 'comun' | 'consumidor'
          level?: number
          description?: string | null
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          company_id: string | null
          client_id: string | null
          role_id: number | null
          name: string
          email: string
          specialization: string | null
          avatar: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          company_id?: string | null
          client_id?: string | null
          role_id?: number | null
          name: string
          email: string
          specialization?: string | null
          avatar?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          client_id?: string | null
          role_id?: number | null
          name?: string
          email?: string
          specialization?: string | null
          avatar?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          company_id: string | null
          name: string
          rut: string | null
          contact_email: string | null
          phone: string | null
          address: string | null
          client_type: 'farmer' | 'agricultural_company' | 'research_institution' | 'government_agency' | 'consultant' | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id?: string | null
          name: string
          rut?: string | null
          contact_email?: string | null
          phone?: string | null
          address?: string | null
          client_type?: 'farmer' | 'agricultural_company' | 'research_institution' | 'government_agency' | 'consultant' | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string | null
          name?: string
          rut?: string | null
          contact_email?: string | null
          phone?: string | null
          address?: string | null
          client_type?: 'farmer' | 'agricultural_company' | 'research_institution' | 'government_agency' | 'consultant' | null
          created_at?: string
        }
      }
      samples: {
        Row: {
          id: string
          client_id: string | null
          company_id: string | null
          code: string
          received_date: string
          registered_date: string
          species: string
          variety: string | null
          planting_year: number | null
          previous_crop: string | null
          next_crop: string | null
          fallow: boolean
          client_notes: string | null
          reception_notes: string | null
          taken_by: 'client' | 'lab' | null
          delivery_method: string | null
          suspected_pathogen: string | null
          status: 'received' | 'processing' | 'microscopy' | 'isolation' | 'identification' | 'molecular_analysis' | 'validation' | 'completed'
          created_at: string
          updated_at: string
          received_at: string | null
          sla_type: 'normal' | 'express'
          due_date: string | null
          sla_status: 'on_time' | 'at_risk' | 'breached'
          region: string | null
          locality: string | null
          sampling_observations: string | null
          reception_observations: string | null
          project_id: string | null
        }
        Insert: {
          id?: string
          client_id?: string | null
          company_id?: string | null
          code: string
          received_date: string
          registered_date?: string
          species: string
          variety?: string | null
          planting_year?: number | null
          previous_crop?: string | null
          next_crop?: string | null
          fallow?: boolean
          client_notes?: string | null
          reception_notes?: string | null
          taken_by?: 'client' | 'lab' | null
          delivery_method?: string | null
          suspected_pathogen?: string | null
          status?: 'received' | 'processing' | 'microscopy' | 'isolation' | 'identification' | 'molecular_analysis' | 'validation' | 'completed'
          created_at?: string
          updated_at?: string
          received_at?: string | null
          sla_type?: 'normal' | 'express'
          due_date?: string | null
          sla_status?: 'on_time' | 'at_risk' | 'breached'
          region?: string | null
          locality?: string | null
          sampling_observations?: string | null
          reception_observations?: string | null
          project_id?: string | null
        }
        Update: {
          id?: string
          client_id?: string | null
          company_id?: string | null
          code?: string
          received_date?: string
          registered_date?: string
          species?: string
          variety?: string | null
          planting_year?: number | null
          previous_crop?: string | null
          next_crop?: string | null
          fallow?: boolean
          client_notes?: string | null
          reception_notes?: string | null
          taken_by?: 'client' | 'lab' | null
          delivery_method?: string | null
          suspected_pathogen?: string | null
          status?: 'received' | 'processing' | 'microscopy' | 'isolation' | 'identification' | 'molecular_analysis' | 'validation' | 'completed'
          created_at?: string
          updated_at?: string
          received_at?: string | null
          sla_type?: 'normal' | 'express'
          due_date?: string | null
          sla_status?: 'on_time' | 'at_risk' | 'breached'
          region?: string | null
          locality?: string | null
          sampling_observations?: string | null
          reception_observations?: string | null
          project_id?: string | null
        }
      }
      results: {
        Row: {
          id: string
          sample_id: string | null
          sample_test_id: string | null
          test_area: string | null
          methodology: string | null
          findings: Record<string, unknown> | null
          conclusion: string | null
          diagnosis: string | null
          pathogen_identified: string | null
          pathogen_type: 'fungus' | 'bacteria' | 'virus' | 'nematode' | 'insect' | 'abiotic' | 'unknown' | null
          severity: 'low' | 'moderate' | 'high' | 'severe' | null
          confidence: 'low' | 'medium' | 'high' | null
          result_type: 'positive' | 'negative' | 'inconclusive' | null
          recommendations: string | null
          performed_by: string | null
          performed_at: string
          validated_by: string | null
          validation_date: string | null
          status: 'pending' | 'completed' | 'validated'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sample_id?: string | null
          sample_test_id?: string | null
          test_area?: string | null
          methodology?: string | null
          findings?: Record<string, unknown> | null
          conclusion?: string | null
          diagnosis?: string | null
          pathogen_identified?: string | null
          pathogen_type?: 'fungus' | 'bacteria' | 'virus' | 'nematode' | 'insect' | 'abiotic' | 'unknown' | null
          severity?: 'low' | 'moderate' | 'high' | 'severe' | null
          confidence?: 'low' | 'medium' | 'high' | null
          result_type?: 'positive' | 'negative' | 'inconclusive' | null
          recommendations?: string | null
          performed_by?: string | null
          performed_at?: string
          validated_by?: string | null
          validation_date?: string | null
          status?: 'pending' | 'completed' | 'validated'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sample_id?: string | null
          sample_test_id?: string | null
          test_area?: string | null
          methodology?: string | null
          findings?: Record<string, unknown> | null
          conclusion?: string | null
          diagnosis?: string | null
          pathogen_identified?: string | null
          pathogen_type?: 'fungus' | 'bacteria' | 'virus' | 'nematode' | 'insect' | 'abiotic' | 'unknown' | null
          severity?: 'low' | 'moderate' | 'high' | 'severe' | null
          confidence?: 'low' | 'medium' | 'high' | null
          result_type?: 'positive' | 'negative' | 'inconclusive' | null
          recommendations?: string | null
          performed_by?: string | null
          performed_at?: string
          validated_by?: string | null
          validation_date?: string | null
          status?: 'pending' | 'completed' | 'validated'
          created_at?: string
          updated_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          sample_id: string | null
          client_id: string | null
          company_id: string | null
          delivery_date: string | null
          template: 'standard' | 'regulatory' | 'summary' | 'detailed' | null
          generated_by: string | null
          completed: boolean
          responsible_id: string | null
          status: 'draft' | 'generated' | 'sent'
          include_recommendations: boolean
          include_images: boolean
          download_url: string | null
          test_areas: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sample_id?: string | null
          client_id?: string | null
          company_id?: string | null
          delivery_date?: string | null
          template?: 'standard' | 'regulatory' | 'summary' | 'detailed' | null
          generated_by?: string | null
          completed?: boolean
          responsible_id?: string | null
          status?: 'draft' | 'generated' | 'sent'
          include_recommendations?: boolean
          include_images?: boolean
          download_url?: string | null
          test_areas?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sample_id?: string | null
          client_id?: string | null
          company_id?: string | null
          delivery_date?: string | null
          template?: 'standard' | 'regulatory' | 'summary' | 'detailed' | null
          generated_by?: string | null
          completed?: boolean
          responsible_id?: string | null
          status?: 'draft' | 'generated' | 'sent'
          include_recommendations?: boolean
          include_images?: boolean
          download_url?: string | null
          test_areas?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      sample_tests: {
        Row: {
          id: string
          sample_id: string
          test_id: number
          method_id: number | null
        }
        Insert: {
          id?: string
          sample_id: string
          test_id: number
          method_id?: number | null
        }
        Update: {
          id?: string
          sample_id?: string
          test_id?: number
          method_id?: number | null
        }
      }
      test_catalog: {
        Row: {
          id: number
          code: string
          name: string
          area: 'nematologia' | 'fitopatologia' | 'virologia' | 'deteccion_precoz'
          default_method_id: number | null
          active: boolean
        }
        Insert: {
          id?: number
          code: string
          name: string
          area: 'nematologia' | 'fitopatologia' | 'virologia' | 'deteccion_precoz'
          default_method_id?: number | null
          active?: boolean
        }
        Update: {
          id?: number
          code?: string
          name?: string
          area?: 'nematologia' | 'fitopatologia' | 'virologia' | 'deteccion_precoz'
          default_method_id?: number | null
          active?: boolean
        }
      }
      methods: {
        Row: {
          id: number
          code: string
          name: string
          description: string | null
          sop_url: string | null
          matrix: 'suelo' | 'hoja' | 'raiz' | 'semilla' | 'racimo'
          units_profile_id: number | null
        }
        Insert: {
          id?: number
          code: string
          name: string
          description?: string | null
          sop_url?: string | null
          matrix: 'suelo' | 'hoja' | 'raiz' | 'semilla' | 'racimo'
          units_profile_id?: number | null
        }
        Update: {
          id?: number
          code?: string
          name?: string
          description?: string | null
          sop_url?: string | null
          matrix?: 'suelo' | 'hoja' | 'raiz' | 'semilla' | 'racimo'
          units_profile_id?: number | null
        }
      }
    }
  }
}

// Convenience types
export type Company = Database['public']['Tables']['companies']['Row']
export type Role = Database['public']['Tables']['roles']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Sample = Database['public']['Tables']['samples']['Row']
export type Result = Database['public']['Tables']['results']['Row']
export type Report = Database['public']['Tables']['reports']['Row']
export type SampleTest = Database['public']['Tables']['sample_tests']['Row']
export type TestCatalog = Database['public']['Tables']['test_catalog']['Row']
export type Method = Database['public']['Tables']['methods']['Row']

// Extended types with relations
export type SampleWithClient = Sample & {
  clients?: Client | null
  sample_tests?: (SampleTest & {
    test_catalog?: TestCatalog | null
    methods?: Method | null
  })[]
}

export type ResultWithRelations = Result & {
  sample_tests?: (SampleTest & {
    test_catalog?: TestCatalog | null
    methods?: Method | null
  }) | null
  samples?: SampleWithClient | null
  performed_by_user?: User | null
  validated_by_user?: User | null
}

// Role-based permissions
export type UserRole = 'admin' | 'validador' | 'comun' | 'consumidor'

// Sample workflow statuses
export type SampleStatus = 'received' | 'processing' | 'microscopy' | 'isolation' | 'identification' | 'molecular_analysis' | 'validation' | 'completed'

// Test types available
export type TestType = 'Visual Inspection' | 'Cultural Isolation' | 'Molecular PCR' | 'Pathogenicity Test' | 'ELISA' | 'Microscopy' | 'Biochemical Tests' | 'Sequencing' | 'Serology' | 'Immunofluorescence'