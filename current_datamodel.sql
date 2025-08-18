-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.action_logs (
  id bigint NOT NULL DEFAULT nextval('action_logs_id_seq'::regclass),
  user_id uuid,
  company_id uuid,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT action_logs_pkey PRIMARY KEY (id),
  CONSTRAINT action_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT action_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
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
CREATE TABLE public.permissions (
  id integer NOT NULL DEFAULT nextval('permissions_id_seq'::regclass),
  role_id integer,
  action text NOT NULL,
  allowed boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT permissions_pkey PRIMARY KEY (id),
  CONSTRAINT permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sample_id uuid UNIQUE,
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
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.samples(id),
  CONSTRAINT reports_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT reports_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id),
  CONSTRAINT reports_responsible_id_fkey FOREIGN KEY (responsible_id) REFERENCES public.users(id)
);
CREATE TABLE public.results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sample_id uuid,
  test_type text CHECK (test_type = ANY (ARRAY['Visual Inspection'::text, 'Cultural Isolation'::text, 'Molecular PCR'::text, 'Pathogenicity Test'::text, 'ELISA'::text, 'Microscopy'::text, 'Biochemical Tests'::text, 'Sequencing'::text, 'Serology'::text, 'Immunofluorescence'::text])),
  methodology text NOT NULL,
  findings jsonb,
  conclusion text,
  diagnosis text,
  pathogen_identified text,
  pathogen_type text CHECK (pathogen_type = ANY (ARRAY['fungus'::text, 'bacteria'::text, 'virus'::text, 'nematode'::text, 'insect'::text, 'abiotic'::text, 'unknown'::text])),
  severity text CHECK (severity = ANY (ARRAY['low'::text, 'moderate'::text, 'high'::text, 'severe'::text])),
  confidence text CHECK (confidence = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  result_type text CHECK (result_type = ANY (ARRAY['positive'::text, 'negative'::text])),
  is_pathogen_present boolean,
  microscopic_observations text,
  cultural_characteristics text,
  molecular_results text,
  recommendations text,
  images ARRAY,
  comments text,
  performed_by uuid,
  performed_at timestamp with time zone DEFAULT now(),
  validated_by uuid,
  validation_date timestamp with time zone,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'validated'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT results_pkey PRIMARY KEY (id),
  CONSTRAINT results_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.samples(id),
  CONSTRAINT results_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id),
  CONSTRAINT results_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.users(id)
);
CREATE TABLE public.role_views (
  id integer NOT NULL DEFAULT nextval('role_views_id_seq'::regclass),
  role_id integer,
  view_id integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT role_views_pkey PRIMARY KEY (id),
  CONSTRAINT role_views_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT role_views_view_id_fkey FOREIGN KEY (view_id) REFERENCES public.views(id)
);
CREATE TABLE public.roles (
  id integer NOT NULL DEFAULT nextval('roles_id_seq'::regclass),
  name text NOT NULL UNIQUE CHECK (name = ANY (ARRAY['admin'::text, 'validador'::text, 'comun'::text, 'consumidor'::text])),
  level integer NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE public.sample_audit_logs (
  id bigint NOT NULL DEFAULT nextval('sample_audit_logs_id_seq'::regclass),
  sample_id uuid,
  user_id uuid,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sample_audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT sample_audit_logs_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.samples(id),
  CONSTRAINT sample_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.samples (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid,
  company_id uuid,
  code text NOT NULL UNIQUE,
  received_date date NOT NULL,
  registered_date date NOT NULL DEFAULT CURRENT_DATE,
  priority text DEFAULT 'normal'::text CHECK (priority = ANY (ARRAY['normal'::text, 'express'::text])),
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
  requested_tests ARRAY NOT NULL,
  status text DEFAULT 'received'::text CHECK (status = ANY (ARRAY['received'::text, 'processing'::text, 'microscopy'::text, 'isolation'::text, 'identification'::text, 'molecular_analysis'::text, 'validation'::text, 'completed'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT samples_pkey PRIMARY KEY (id),
  CONSTRAINT samples_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT samples_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  company_id uuid,
  client_id uuid,
  role_id integer,
  name text NOT NULL,
  email text NOT NULL,
  specialization text,
  avatar text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT users_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);
CREATE TABLE public.views (
  id integer NOT NULL DEFAULT nextval('views_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  label text,
  path text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT views_pkey PRIMARY KEY (id)
);