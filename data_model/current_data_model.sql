-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.action_logs (
  id bigint NOT NULL,
  user_id uuid,
  company_id uuid,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT action_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.analytes (
  id bigint NOT NULL DEFAULT nextval('analytes_id_seq'::regclass),
  code text UNIQUE,
  scientific_name text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['virus'::text, 'hongo'::text, 'nematodo'::text, 'bacteria'::text, 'abiotico'::text])),
  CONSTRAINT analytes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.applied_interpretations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sample_id uuid NOT NULL,
  rule_id uuid NOT NULL,
  message text NOT NULL,
  severity text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT applied_interpretations_pkey PRIMARY KEY (id),
  CONSTRAINT applied_interpretations_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.samples(id),
  CONSTRAINT applied_interpretations_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.interpretation_rules(id)
);
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid,
  name text NOT NULL,
  rut text,
  contact_email text,
  phone text,
  address text,
  client_type text CHECK (client_type = ANY (ARRAY['farmer'::text, 'agricultural_company'::text, 'research_institution'::text, 'government_agency'::text, 'consultant'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT clients_pkey PRIMARY KEY (id),
  CONSTRAINT clients_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);
CREATE TABLE public.interpretation_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  area text NOT NULL CHECK (area = ANY (ARRAY['nematologia'::text, 'fitopatologia'::text, 'virologia'::text, 'deteccion_precoz'::text])),
  species text,
  crop_next text,
  analyte text NOT NULL,
  comparator text NOT NULL CHECK (comparator = ANY (ARRAY['>'::text, '>='::text, '='::text, 'in'::text])),
  threshold_json jsonb NOT NULL,
  message text NOT NULL,
  severity text NOT NULL CHECK (severity = ANY (ARRAY['low'::text, 'moderate'::text, 'high'::text])),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT interpretation_rules_pkey PRIMARY KEY (id)
);
CREATE TABLE public.invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['client_user'::text, 'collaborator'::text])),
  client_id uuid,
  company_id uuid,
  invited_by uuid,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT invitations_pkey PRIMARY KEY (id),
  CONSTRAINT invitations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT invitations_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id)
);
CREATE TABLE public.methods (
  id bigint NOT NULL DEFAULT nextval('methods_id_seq'::regclass),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  sop_url text,
  matrix text NOT NULL CHECK (matrix = ANY (ARRAY['suelo'::text, 'hoja'::text, 'raiz'::text, 'semilla'::text, 'racimo'::text])),
  units_profile_id bigint,
  CONSTRAINT methods_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  channel text NOT NULL CHECK (channel = ANY (ARRAY['email'::text, 'sms'::text, 'webhook'::text])),
  to_ref jsonb NOT NULL,
  template_code text NOT NULL,
  payload jsonb,
  sent_at timestamp with time zone,
  status text DEFAULT 'queued'::text CHECK (status = ANY (ARRAY['queued'::text, 'sent'::text, 'error'::text])),
  error text,
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);
CREATE TABLE public.permissions (
  id integer NOT NULL,
  role_id integer,
  action text NOT NULL,
  allowed boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT permissions_pkey PRIMARY KEY (id),
  CONSTRAINT permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);
CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  start_date date,
  end_date date,
  notes text,
  company_id uuid,
  CONSTRAINT projects_pkey PRIMARY KEY (id),
  CONSTRAINT projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
CREATE TABLE public.report_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  file_url text NOT NULL,
  type text NOT NULL DEFAULT 'raw'::text CHECK (type = ANY (ARRAY['image'::text, 'table'::text, 'raw'::text])),
  CONSTRAINT report_assets_pkey PRIMARY KEY (id),
  CONSTRAINT report_assets_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id)
);
CREATE TABLE public.report_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  file_url text,
  schema_json jsonb,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT report_templates_pkey PRIMARY KEY (id)
);
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid,
  company_id uuid,
  delivery_date date,
  template text CHECK (template = ANY (ARRAY['standard'::text, 'regulatory'::text, 'summary'::text, 'detailed'::text])),
  generated_by uuid,
  completed boolean DEFAULT false,
  responsible_id uuid,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'generated'::text, 'sent'::text])),
  include_recommendations boolean DEFAULT true,
  include_images boolean DEFAULT true,
  download_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  template_id uuid,
  version integer NOT NULL DEFAULT 1,
  rendered_pdf_url text,
  checksum text,
  supersedes_report_id uuid,
  visibility text NOT NULL DEFAULT 'client'::text CHECK (visibility = ANY (ARRAY['internal'::text, 'client'::text])),
  test_areas ARRAY DEFAULT '{}'::text[],
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_supersedes_report_id_fkey FOREIGN KEY (supersedes_report_id) REFERENCES public.reports(id),
  CONSTRAINT reports_responsible_id_fkey FOREIGN KEY (responsible_id) REFERENCES public.users(id),
  CONSTRAINT reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id),
  CONSTRAINT reports_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT reports_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT reports_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.report_templates(id)
);
CREATE TABLE public.results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sample_id uuid NOT NULL,
  conclusion text,
  diagnosis text,
  recommendations text,
  performed_by uuid,
  performed_at timestamp with time zone DEFAULT now(),
  validated_by uuid,
  validation_date timestamp with time zone,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'validated'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  sample_test_id uuid,
  test_area text,
  methodology text,
  findings jsonb,
  pathogen_identified text,
  pathogen_type text CHECK (pathogen_type = ANY (ARRAY['fungus'::text, 'bacteria'::text, 'virus'::text, 'nematode'::text, 'insect'::text, 'abiotic'::text, 'unknown'::text])),
  severity text CHECK (severity = ANY (ARRAY['low'::text, 'moderate'::text, 'high'::text, 'severe'::text])),
  confidence text CHECK (confidence = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  result_type text CHECK (result_type = ANY (ARRAY['positive'::text, 'negative'::text, 'inconclusive'::text])),
  report_id uuid,
  CONSTRAINT results_pkey PRIMARY KEY (id),
  CONSTRAINT results_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id),
  CONSTRAINT results_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.samples(id),
  CONSTRAINT results_sample_test_id_fkey FOREIGN KEY (sample_test_id) REFERENCES public.sample_tests(id),
  CONSTRAINT results_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.users(id),
  CONSTRAINT results_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id)
);
CREATE TABLE public.role_views (
  id integer NOT NULL,
  role_id integer,
  view_id integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT role_views_pkey PRIMARY KEY (id),
  CONSTRAINT role_views_view_id_fkey FOREIGN KEY (view_id) REFERENCES public.views(id),
  CONSTRAINT role_views_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);
CREATE TABLE public.roles (
  id integer NOT NULL,
  name text NOT NULL UNIQUE CHECK (name = ANY (ARRAY['admin'::text, 'validador'::text, 'comun'::text, 'consumidor'::text])),
  level integer NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sample_audit_logs (
  id bigint NOT NULL,
  sample_id uuid,
  user_id uuid,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sample_audit_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sample_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sample_id uuid NOT NULL,
  file_url text NOT NULL,
  kind text NOT NULL DEFAULT 'other'::text CHECK (kind = ANY (ARRAY['microscopy'::text, 'raw'::text, 'form'::text, 'other'::text])),
  uploaded_by uuid,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sample_files_pkey PRIMARY KEY (id),
  CONSTRAINT sample_files_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.samples(id),
  CONSTRAINT sample_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id)
);
CREATE TABLE public.sample_status_transitions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sample_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  by_user uuid,
  at timestamp with time zone NOT NULL DEFAULT now(),
  reason text,
  CONSTRAINT sample_status_transitions_pkey PRIMARY KEY (id),
  CONSTRAINT sample_status_transitions_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.samples(id),
  CONSTRAINT sample_status_transitions_by_user_fkey FOREIGN KEY (by_user) REFERENCES public.users(id)
);
CREATE TABLE public.sample_tests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sample_id uuid NOT NULL,
  test_id bigint NOT NULL,
  method_id bigint,
  CONSTRAINT sample_tests_pkey PRIMARY KEY (id),
  CONSTRAINT sample_tests_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.test_catalog(id),
  CONSTRAINT sample_tests_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.methods(id),
  CONSTRAINT sample_tests_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.samples(id)
);
CREATE TABLE public.sample_units (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sample_id uuid NOT NULL,
  code text,
  label text,
  CONSTRAINT sample_units_pkey PRIMARY KEY (id),
  CONSTRAINT sample_units_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.samples(id)
);
CREATE TABLE public.samples (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid,
  company_id uuid,
  code text NOT NULL UNIQUE,
  received_date date NOT NULL,
  registered_date date NOT NULL DEFAULT CURRENT_DATE,
  species text NOT NULL,
  variety text,
  planting_year integer,
  previous_crop text,
  next_crop text,
  fallow boolean DEFAULT false,
  client_notes text,
  reception_notes text,
  taken_by text CHECK (taken_by = ANY (ARRAY['client'::text, 'lab'::text])),
  delivery_method text,
  suspected_pathogen text,
  status text DEFAULT 'received'::text CHECK (status = ANY (ARRAY['received'::text, 'processing'::text, 'microscopy'::text, 'isolation'::text, 'identification'::text, 'molecular_analysis'::text, 'validation'::text, 'completed'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  received_at timestamp with time zone,
  sla_type text DEFAULT 'normal'::text CHECK (sla_type = ANY (ARRAY['normal'::text, 'express'::text])),
  due_date date,
  sla_status text DEFAULT 'on_time'::text CHECK (sla_status = ANY (ARRAY['on_time'::text, 'at_risk'::text, 'breached'::text])),
  region text,
  locality text,
  sampling_observations text,
  reception_observations text,
  project_id uuid,
  rootstock text,
  CONSTRAINT samples_pkey PRIMARY KEY (id),
  CONSTRAINT samples_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id),
  CONSTRAINT samples_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT samples_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.sla_policies (
  id bigint NOT NULL DEFAULT nextval('sla_policies_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  business_days integer NOT NULL CHECK (business_days > 0),
  area text CHECK (area = ANY (ARRAY['nematologia'::text, 'fitopatologia'::text, 'virologia'::text, 'deteccion_precoz'::text])),
  CONSTRAINT sla_policies_pkey PRIMARY KEY (id)
);
CREATE TABLE public.species (
  id bigint NOT NULL DEFAULT nextval('species_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  CONSTRAINT species_pkey PRIMARY KEY (id)
);
CREATE TABLE public.test_catalog (
  id bigint NOT NULL DEFAULT nextval('test_catalog_id_seq'::regclass),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  area text NOT NULL CHECK (area = ANY (ARRAY['nematologia'::text, 'fitopatologia'::text, 'virologia'::text, 'deteccion_precoz'::text])),
  default_method_id bigint,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT test_catalog_pkey PRIMARY KEY (id),
  CONSTRAINT test_catalog_default_method_id_fkey FOREIGN KEY (default_method_id) REFERENCES public.methods(id)
);
CREATE TABLE public.test_method_map (
  test_id bigint NOT NULL,
  method_id bigint NOT NULL,
  CONSTRAINT test_method_map_pkey PRIMARY KEY (test_id, method_id),
  CONSTRAINT test_method_map_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.methods(id),
  CONSTRAINT test_method_map_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.test_catalog(id)
);
CREATE TABLE public.tissues (
  id bigint NOT NULL DEFAULT nextval('tissues_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  CONSTRAINT tissues_pkey PRIMARY KEY (id)
);
CREATE TABLE public.unit_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sample_unit_id uuid NOT NULL,
  test_id bigint NOT NULL,
  method_id bigint,
  analyte text,
  result_value numeric,
  result_flag text DEFAULT 'na'::text CHECK (result_flag = ANY (ARRAY['positivo'::text, 'negativo'::text, 'na'::text])),
  notes text,
  CONSTRAINT unit_results_pkey PRIMARY KEY (id),
  CONSTRAINT unit_results_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.test_catalog(id),
  CONSTRAINT unit_results_sample_unit_id_fkey FOREIGN KEY (sample_unit_id) REFERENCES public.sample_units(id),
  CONSTRAINT unit_results_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.methods(id)
);
CREATE TABLE public.units_profile_fields (
  id bigint NOT NULL DEFAULT nextval('units_profile_fields_id_seq'::regclass),
  units_profile_id bigint NOT NULL,
  field_name text NOT NULL,
  unit text,
  type text NOT NULL DEFAULT 'numeric'::text CHECK (type = ANY (ARRAY['int'::text, 'numeric'::text, 'text'::text, 'bool'::text])),
  CONSTRAINT units_profile_fields_pkey PRIMARY KEY (id),
  CONSTRAINT units_profile_fields_units_profile_id_fkey FOREIGN KEY (units_profile_id) REFERENCES public.units_profiles(id)
);
CREATE TABLE public.units_profiles (
  id bigint NOT NULL DEFAULT nextval('units_profiles_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  CONSTRAINT units_profiles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  company_id uuid,
  client_id uuid,
  name text NOT NULL,
  email text NOT NULL,
  specialization text,
  avatar text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  role_id integer,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT users_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
CREATE TABLE public.varieties (
  id bigint NOT NULL DEFAULT nextval('varieties_id_seq'::regclass),
  species_id bigint NOT NULL,
  name text NOT NULL,
  CONSTRAINT varieties_pkey PRIMARY KEY (id),
  CONSTRAINT varieties_species_id_fkey FOREIGN KEY (species_id) REFERENCES public.species(id)
);
CREATE TABLE public.views (
  id integer NOT NULL,
  name text NOT NULL UNIQUE,
  label text,
  path text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT views_pkey PRIMARY KEY (id)
);