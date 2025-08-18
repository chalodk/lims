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
          priority: 'normal' | 'express'
          project: 'Externa' | 'Syngenta (Circulo Syngenta)' | 'Syngenta (Ensayos)' | 'FMC' | 'Copeval' | 'Bayer' | 'Basf' | 'Corteva' | 'Anasac' | 'UPL' | 'Trical' | 'Agrospec' | null
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
          requested_tests: string[]
          status: 'received' | 'processing' | 'microscopy' | 'isolation' | 'identification' | 'molecular_analysis' | 'validation' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          company_id?: string | null
          code: string
          received_date: string
          registered_date?: string
          priority?: 'normal' | 'express'
          project?: 'Externa' | 'Syngenta (Circulo Syngenta)' | 'Syngenta (Ensayos)' | 'FMC' | 'Copeval' | 'Bayer' | 'Basf' | 'Corteva' | 'Anasac' | 'UPL' | 'Trical' | 'Agrospec' | null
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
          requested_tests: string[]
          status?: 'received' | 'processing' | 'microscopy' | 'isolation' | 'identification' | 'molecular_analysis' | 'validation' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          company_id?: string | null
          code?: string
          received_date?: string
          registered_date?: string
          priority?: 'normal' | 'express'
          project?: 'Externa' | 'Syngenta (Circulo Syngenta)' | 'Syngenta (Ensayos)' | 'FMC' | 'Copeval' | 'Bayer' | 'Basf' | 'Corteva' | 'Anasac' | 'UPL' | 'Trical' | 'Agrospec' | null
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
          requested_tests?: string[]
          status?: 'received' | 'processing' | 'microscopy' | 'isolation' | 'identification' | 'molecular_analysis' | 'validation' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
      results: {
        Row: {
          id: string
          sample_id: string | null
          test_type: 'Visual Inspection' | 'Cultural Isolation' | 'Molecular PCR' | 'Pathogenicity Test' | 'ELISA' | 'Microscopy' | 'Biochemical Tests' | 'Sequencing' | 'Serology' | 'Immunofluorescence' | null
          methodology: string
          findings: Record<string, unknown> | null
          conclusion: string | null
          diagnosis: string | null
          pathogen_identified: string | null
          pathogen_type: 'fungus' | 'bacteria' | 'virus' | 'nematode' | 'insect' | 'abiotic' | 'unknown' | null
          severity: 'low' | 'moderate' | 'high' | 'severe' | null
          confidence: 'low' | 'medium' | 'high' | null
          result_type: 'positive' | 'negative' | null
          is_pathogen_present: boolean | null
          microscopic_observations: string | null
          cultural_characteristics: string | null
          molecular_results: string | null
          recommendations: string | null
          images: string[] | null
          comments: string | null
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
          test_type?: 'Visual Inspection' | 'Cultural Isolation' | 'Molecular PCR' | 'Pathogenicity Test' | 'ELISA' | 'Microscopy' | 'Biochemical Tests' | 'Sequencing' | 'Serology' | 'Immunofluorescence' | null
          methodology: string
          findings?: Record<string, unknown> | null
          conclusion?: string | null
          diagnosis?: string | null
          pathogen_identified?: string | null
          pathogen_type?: 'fungus' | 'bacteria' | 'virus' | 'nematode' | 'insect' | 'abiotic' | 'unknown' | null
          severity?: 'low' | 'moderate' | 'high' | 'severe' | null
          confidence?: 'low' | 'medium' | 'high' | null
          result_type?: 'positive' | 'negative' | null
          is_pathogen_present?: boolean | null
          microscopic_observations?: string | null
          cultural_characteristics?: string | null
          molecular_results?: string | null
          recommendations?: string | null
          images?: string[] | null
          comments?: string | null
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
          test_type?: 'Visual Inspection' | 'Cultural Isolation' | 'Molecular PCR' | 'Pathogenicity Test' | 'ELISA' | 'Microscopy' | 'Biochemical Tests' | 'Sequencing' | 'Serology' | 'Immunofluorescence' | null
          methodology?: string
          findings?: Record<string, unknown> | null
          conclusion?: string | null
          diagnosis?: string | null
          pathogen_identified?: string | null
          pathogen_type?: 'fungus' | 'bacteria' | 'virus' | 'nematode' | 'insect' | 'abiotic' | 'unknown' | null
          severity?: 'low' | 'moderate' | 'high' | 'severe' | null
          confidence?: 'low' | 'medium' | 'high' | null
          result_type?: 'positive' | 'negative' | null
          is_pathogen_present?: boolean | null
          microscopic_observations?: string | null
          cultural_characteristics?: string | null
          molecular_results?: string | null
          recommendations?: string | null
          images?: string[] | null
          comments?: string | null
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
          created_at?: string
          updated_at?: string
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

// Extended types with relations
export type SampleWithClient = Sample & {
  clients?: Client | null
}

// Role-based permissions
export type UserRole = 'admin' | 'validador' | 'comun' | 'consumidor'

// Sample workflow statuses
export type SampleStatus = 'received' | 'processing' | 'microscopy' | 'isolation' | 'identification' | 'molecular_analysis' | 'validation' | 'completed'

// Test types available
export type TestType = 'Visual Inspection' | 'Cultural Isolation' | 'Molecular PCR' | 'Pathogenicity Test' | 'ELISA' | 'Microscopy' | 'Biochemical Tests' | 'Sequencing' | 'Serology' | 'Immunofluorescence'