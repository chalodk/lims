// src/types/supabase.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

// ---------- Enums inferidos desde tus CHECK constraints ----------
export type AnalyteKind = 'virus' | 'hongo' | 'nematodo' | 'bacteria' | 'abiotico'
export type AreaType = 'nematologia' | 'fitopatologia' | 'virologia' | 'deteccion_precoz'
export type ComparatorType = '>' | '>=' | '=' | 'in'
export type RuleSeverity = 'low' | 'moderate' | 'high'
export type InvitationRole = 'client_user' | 'collaborator'
export type MatrixType = 'suelo' | 'hoja' | 'raiz' | 'semilla' | 'racimo'
export type NotificationChannel = 'email' | 'sms' | 'webhook'
export type NotificationStatus = 'queued' | 'sent' | 'error'
export type ReportAssetType = 'image' | 'table' | 'raw'
export type ReportTemplate = 'standard' | 'regulatory' | 'summary' | 'detailed'
export type ReportStatus = 'draft' | 'generated' | 'sent' | 'validated'
export type ReportVisibility = 'internal' | 'client'
export type ResultStatus = 'pending' | 'completed' | 'validated'
export type PathogenType =
  | 'fungus'
  | 'bacteria'
  | 'virus'
  | 'nematode'
  | 'insect'
  | 'abiotic'
  | 'unknown'
export type SeverityExtended = 'low' | 'moderate' | 'high' | 'severe'
export type Confidence = 'low' | 'medium' | 'high'
export type ResultType = 'positive' | 'negative' | 'inconclusive'
export type RoleName = 'admin' | 'validador' | 'comun' | 'consumidor'
export type SampleTakenBy = 'client' | 'lab'
export type SampleStatus =
  | 'received'
  | 'processing'
  | 'microscopy'
  | 'isolation'
  | 'identification'
  | 'molecular_analysis'
  | 'validation'
  | 'completed'
export type SLAType = 'normal' | 'express'
export type SLAStatus = 'on_time' | 'at_risk' | 'breached'
export type SampleFileKind = 'microscopy' | 'raw' | 'form' | 'other'
export type UnitFieldType = 'int' | 'numeric' | 'text' | 'bool'
export type UnitResultFlag = 'positivo' | 'negativo' | 'na'
export type ClientType =
  | 'farmer'
  | 'agricultural_company'
  | 'research_institution'
  | 'government_agency'
  | 'consultant'

// ---------- Esquema Database ----------
export interface Database {
  public: {
    Tables: {
      action_logs: {
        Row: {
          id: number
          user_id: string | null
          company_id: string | null
          action: string
          target_table: string | null
          target_id: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id: number
          user_id?: string | null
          company_id?: string | null
          action: string
          target_table?: string | null
          target_id?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['action_logs']['Insert']>
      }

      analytes: {
        Row: {
          id: number
          code: string | null
          scientific_name: string
          type: AnalyteKind
        }
        Insert: {
          id?: number
          code?: string | null
          scientific_name: string
          type: AnalyteKind
        }
        Update: Partial<Database['public']['Tables']['analytes']['Insert']>
      }

      applied_interpretations: {
        Row: {
          id: string
          sample_id: string
          rule_id: string
          message: string
          severity: string
          created_at: string
        }
        Insert: {
          id?: string
          sample_id: string
          rule_id: string
          message: string
          severity: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['applied_interpretations']['Insert']>
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
          client_type: ClientType | null
          observation: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          company_id?: string | null
          name: string
          rut?: string | null
          contact_email?: string | null
          phone?: string | null
          address?: string | null
          client_type?: ClientType | null
          observation?: boolean | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
      }

      companies: {
        Row: {
          id: string
          name: string
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['companies']['Insert']>
      }

      interpretation_rules: {
        Row: {
          id: string
          area: AreaType
          species: string | null
          crop_next: string | null
          analyte: string
          comparator: ComparatorType
          threshold_json: Json
          message: string
          severity: RuleSeverity
          active: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          area: AreaType
          species?: string | null
          crop_next?: string | null
          analyte: string
          comparator: ComparatorType
          threshold_json: Json
          message: string
          severity: RuleSeverity
          active?: boolean
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['interpretation_rules']['Insert']>
      }

      invitations: {
        Row: {
          id: string
          email: string
          role: InvitationRole
          client_id: string | null
          company_id: string | null
          invited_by: string | null
          token: string
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          role: InvitationRole
          client_id?: string | null
          company_id?: string | null
          invited_by?: string | null
          token: string
          expires_at: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['invitations']['Insert']>
      }

      methods: {
        Row: {
          id: number
          code: string
          name: string
          description: string | null
          sop_url: string | null
          matrix: MatrixType
          units_profile_id: number | null
        }
        Insert: {
          id?: number
          code: string
          name: string
          description?: string | null
          sop_url?: string | null
          matrix: MatrixType
          units_profile_id?: number | null
        }
        Update: Partial<Database['public']['Tables']['methods']['Insert']>
      }

      notifications: {
        Row: {
          id: string
          channel: NotificationChannel
          to_ref: Json
          template_code: string
          payload: Json | null
          sent_at: string | null
          status: NotificationStatus | null
          error: string | null
        }
        Insert: {
          id?: string
          channel: NotificationChannel
          to_ref: Json
          template_code: string
          payload?: Json | null
          sent_at?: string | null
          status?: NotificationStatus | null
          error?: string | null
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }

      permissions: {
        Row: {
          id: number
          role_id: number | null
          action: string
          allowed: boolean | null
          created_at: string | null
        }
        Insert: {
          id: number
          role_id?: number | null
          action: string
          allowed?: boolean | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['permissions']['Insert']>
      }

      projects: {
        Row: {
          id: string
          name: string
          code: string | null
          start_date: string | null // date
          end_date: string | null // date
          notes: string | null
          company_id: string | null
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          start_date?: string | null
          end_date?: string | null
          notes?: string | null
          company_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }

      report_assets: {
        Row: {
          id: string
          report_id: string
          file_url: string
          type: ReportAssetType
        }
        Insert: {
          id?: string
          report_id: string
          file_url: string
          type?: ReportAssetType
        }
        Update: Partial<Database['public']['Tables']['report_assets']['Insert']>
      }

      report_templates: {
        Row: {
          id: string
          code: string
          name: string
          version: number
          file_url: string | null
          schema_json: Json | null
          active: boolean
        }
        Insert: {
          id?: string
          code: string
          name: string
          version?: number
          file_url?: string | null
          schema_json?: Json | null
          active?: boolean
        }
        Update: Partial<Database['public']['Tables']['report_templates']['Insert']>
      }

      reports: {
        Row: {
          id: string
          sample_id: string | null
          client_id: string | null
          company_id: string | null
          delivery_date: string | null // date
          template: ReportTemplate | null
          generated_by: string | null
          completed: boolean | null
          responsible_id: string | null
          status: ReportStatus | null
          include_recommendations: boolean | null
          include_images: boolean | null
          download_url: string | null
          created_at: string | null
          updated_at: string | null
          template_id: string | null
          version: number
          rendered_pdf_url: string | null
          checksum: string | null
          supersedes_report_id: string | null
          visibility: ReportVisibility
          test_areas: string[] // text[]
          payment: boolean | null
          invoice_number: string | null
          payload: Record<string, unknown> | null // jsonb
        }
        Insert: {
          id?: string
          sample_id?: string | null
          client_id?: string | null
          company_id?: string | null
          delivery_date?: string | null
          template?: ReportTemplate | null
          generated_by?: string | null
          completed?: boolean | null
          responsible_id?: string | null
          status?: ReportStatus | null
          include_recommendations?: boolean | null
          include_images?: boolean | null
          download_url?: string | null
          created_at?: string | null
          updated_at?: string | null
          template_id?: string | null
          version?: number
          rendered_pdf_url?: string | null
          checksum?: string | null
          supersedes_report_id?: string | null
          visibility?: ReportVisibility
          test_areas?: string[]
          payment?: boolean | null
          invoice_number?: string | null
          payload?: Record<string, unknown> | null // jsonb
        }
        Update: Partial<Database['public']['Tables']['reports']['Insert']>
      }

      results: {
        Row: {
          id: string
          sample_id: string
          conclusion: string | null
          diagnosis: string | null
          recommendations: string | null
          performed_by: string | null
          performed_at: string | null
          validated_by: string | null
          validation_date: string | null
          status: ResultStatus | null
          created_at: string | null
          updated_at: string | null
          sample_test_id: string | null
          test_area: string | null
          methodology: string | null
          findings: Json | null
          pathogen_identified: string | null
          pathogen_type: PathogenType | null
          severity: SeverityExtended | null
          confidence: Confidence | null
          result_type: ResultType | null
        }
        Insert: {
          id?: string
          sample_id: string
          conclusion?: string | null
          diagnosis?: string | null
          recommendations?: string | null
          performed_by?: string | null
          performed_at?: string | null
          validated_by?: string | null
          validation_date?: string | null
          status?: ResultStatus | null
          created_at?: string | null
          updated_at?: string | null
          sample_test_id?: string | null
          test_area?: string | null
          methodology?: string | null
          findings?: Json | null
          pathogen_identified?: string | null
          pathogen_type?: PathogenType | null
          severity?: SeverityExtended | null
          confidence?: Confidence | null
          result_type?: ResultType | null
        }
        Update: Partial<Database['public']['Tables']['results']['Insert']>
      }

      role_views: {
        Row: {
          id: number
          role_id: number | null
          view_id: number | null
          created_at: string | null
        }
        Insert: {
          id: number
          role_id?: number | null
          view_id?: number | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['role_views']['Insert']>
      }

      roles: {
        Row: {
          id: number
          name: RoleName
          level: number
          description: string | null
          created_at: string | null
        }
        Insert: {
          id: number
          name: RoleName
          level: number
          description?: string | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['roles']['Insert']>
      }

      sample_audit_logs: {
        Row: {
          id: number
          sample_id: string | null
          user_id: string | null
          action: string
          old_values: Json | null
          new_values: Json | null
          created_at: string | null
        }
        Insert: {
          id: number
          sample_id?: string | null
          user_id?: string | null
          action: string
          old_values?: Json | null
          new_values?: Json | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['sample_audit_logs']['Insert']>
      }

      sample_files: {
        Row: {
          id: string
          sample_id: string
          file_url: string
          kind: SampleFileKind
          uploaded_by: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          sample_id: string
          file_url: string
          kind?: SampleFileKind
          uploaded_by?: string | null
          uploaded_at?: string
        }
        Update: Partial<Database['public']['Tables']['sample_files']['Insert']>
      }

      sample_status_transitions: {
        Row: {
          id: string
          sample_id: string
          from_status: SampleStatus | null
          to_status: SampleStatus
          by_user: string | null
          at: string
          reason: string | null
        }
        Insert: {
          id?: string
          sample_id: string
          from_status?: SampleStatus | null
          to_status: SampleStatus
          by_user?: string | null
          at?: string
          reason?: string | null
        }
        Update: Partial<Database['public']['Tables']['sample_status_transitions']['Insert']>
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
        Update: Partial<Database['public']['Tables']['sample_tests']['Insert']>
      }

      sample_units: {
        Row: {
          id: string
          sample_id: string
          code: string | null
          label: string | null
        }
        Insert: {
          id?: string
          sample_id: string
          code?: string | null
          label?: string | null
        }
        Update: Partial<Database['public']['Tables']['sample_units']['Insert']>
      }

      samples: {
        Row: {
          id: string
          client_id: string | null
          company_id: string | null
          code: string
          received_date: string
          registered_date: string | null
          species: string
          variety: string | null
          planting_year: number | null
          previous_crop: string | null
          next_crop: string | null
          fallow: boolean | null
          client_notes: string | null
          reception_notes: string | null
          taken_by: SampleTakenBy | null
          delivery_method: string | null
          suspected_pathogen: string | null
          status: SampleStatus | null
          created_at: string | null
          updated_at: string | null
          received_at: string | null
          sla_type: SLAType | null
          due_date: string | null // date
          sla_status: SLAStatus | null
          region: string | null
          locality: string | null
          sampling_observations: string | null
          reception_observations: string | null
          project_id: string | null
          rootstock: string | null
        }
        Insert: {
          id?: string
          client_id?: string | null
          company_id?: string | null
          code: string
          received_date: string
          registered_date?: string | null
          species: string
          variety?: string | null
          planting_year?: number | null
          previous_crop?: string | null
          next_crop?: string | null
          fallow?: boolean | null
          client_notes?: string | null
          reception_notes?: string | null
          taken_by?: SampleTakenBy | null
          delivery_method?: string | null
          suspected_pathogen?: string | null
          status?: SampleStatus | null
          created_at?: string | null
          updated_at?: string | null
          received_at?: string | null
          sla_type?: SLAType | null
          due_date?: string | null
          sla_status?: SLAStatus | null
          region?: string | null
          locality?: string | null
          sampling_observations?: string | null
          reception_observations?: string | null
          project_id?: string | null
          rootstock?: string | null
        }
        Update: Partial<Database['public']['Tables']['samples']['Insert']>
      }

      sla_policies: {
        Row: {
          id: number
          name: string
          business_days: number
          area: AreaType | null
        }
        Insert: {
          id?: number
          name: string
          business_days: number
          area?: AreaType | null
        }
        Update: Partial<Database['public']['Tables']['sla_policies']['Insert']>
      }

      species: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: Partial<Database['public']['Tables']['species']['Insert']>
      }

      test_catalog: {
        Row: {
          id: number
          code: string
          name: string
          area: AreaType
          default_method_id: number | null
          active: boolean
        }
        Insert: {
          id?: number
          code: string
          name: string
          area: AreaType
          default_method_id?: number | null
          active?: boolean
        }
        Update: Partial<Database['public']['Tables']['test_catalog']['Insert']>
      }

      test_method_map: {
        Row: {
          test_id: number
          method_id: number
        }
        Insert: {
          test_id: number
          method_id: number
        }
        Update: Partial<Database['public']['Tables']['test_method_map']['Insert']>
      }

      tissues: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: Partial<Database['public']['Tables']['tissues']['Insert']>
      }

      unit_results: {
        Row: {
          id: string
          sample_unit_id: string
          test_id: number
          method_id: number | null
          analyte: string | null
          result_value: number | null
          result_flag: UnitResultFlag | null
          notes: string | null
        }
        Insert: {
          id?: string
          sample_unit_id: string
          test_id: number
          method_id?: number | null
          analyte?: string | null
          result_value?: number | null
          result_flag?: UnitResultFlag | null
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['unit_results']['Insert']>
      }

      units_profile_fields: {
        Row: {
          id: number
          units_profile_id: number
          field_name: string
          unit: string | null
          type: UnitFieldType
        }
        Insert: {
          id?: number
          units_profile_id: number
          field_name: string
          unit?: string | null
          type?: UnitFieldType
        }
        Update: Partial<Database['public']['Tables']['units_profile_fields']['Insert']>
      }

      units_profiles: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: Partial<Database['public']['Tables']['units_profiles']['Insert']>
      }

      users: {
        Row: {
          id: string
          company_id: string | null
          client_id: string | null
          name: string
          email: string
          specialization: string | null
          avatar: string | null
          created_at: string | null
          updated_at: string | null
          role_id: number | null
        }
        Insert: {
          id: string
          company_id?: string | null
          client_id?: string | null
          name: string
          email: string
          specialization?: string | null
          avatar?: string | null
          created_at?: string | null
          updated_at?: string | null
          role_id?: number | null
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }

      varieties: {
        Row: {
          id: number
          species_id: number
          name: string
        }
        Insert: {
          id?: number
          species_id: number
          name: string
        }
        Update: Partial<Database['public']['Tables']['varieties']['Insert']>
      }

      views: {
        Row: {
          id: number
          name: string
          label: string | null
          path: string | null
          created_at: string | null
        }
        Insert: {
          id: number
          name: string
          label?: string | null
          path?: string | null
          created_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['views']['Insert']>
      }
    }

    Views: {
      [_ in never]: never
    }

    Functions: {
      [_ in never]: never
    }

    Enums: {
      // Si prefieres acceder como Database['public']['Enums']['RoleName'], etc.
      AnalyteKind: AnalyteKind
      AreaType: AreaType
      ComparatorType: ComparatorType
      RuleSeverity: RuleSeverity
      InvitationRole: InvitationRole
      MatrixType: MatrixType
      NotificationChannel: NotificationChannel
      NotificationStatus: NotificationStatus
      ReportAssetType: ReportAssetType
      ReportTemplate: ReportTemplate
      ReportStatus: ReportStatus
      ReportVisibility: ReportVisibility
      ResultStatus: ResultStatus
      PathogenType: PathogenType
      SeverityExtended: SeverityExtended
      Confidence: Confidence
      ResultType: ResultType
      RoleName: RoleName
      SampleTakenBy: SampleTakenBy
      SampleStatus: SampleStatus
      SLAType: SLAType
      SLAStatus: SLAStatus
      SampleFileKind: SampleFileKind
      UnitFieldType: UnitFieldType
      UnitResultFlag: UnitResultFlag
      ClientType: ClientType
    }
  }
}

// Helpers
export type PublicSchema = Database['public']
export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row']

// Convenience types for commonly used tables
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
export type InterpretationRule = Database['public']['Tables']['interpretation_rules']['Row']
export type AppliedInterpretation = Database['public']['Tables']['applied_interpretations']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type SampleUnit = Database['public']['Tables']['sample_units']['Row']
export type UnitResult = Database['public']['Tables']['unit_results']['Row']

// Extended types with relations for complex queries
export type SampleWithClient = Sample & {
  clients?: Client | null
  sample_tests?: (SampleTest & {
    test_catalog?: TestCatalog | null
    methods?: Method | null
  })[]
}

export type SampleFull = Sample & {
  clients?: Client | null
  projects?: Project | null
  sample_tests?: (SampleTest & {
    test_catalog?: TestCatalog | null
    methods?: Method | null
  })[]
  sample_units?: (SampleUnit & {
    unit_results?: (UnitResult & {
      test_catalog?: TestCatalog | null
      methods?: Method | null
    })[]
  })[]
  applied_interpretations?: (AppliedInterpretation & {
    interpretation_rules?: InterpretationRule | null
  })[]
  reports?: Report[]
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

// Template table type
export type ReportTemplateRow = Database['public']['Tables']['report_templates']['Row']