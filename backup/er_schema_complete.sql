-- ============================================================================
-- LIMS — Esquema completo de base de datos
-- ============================================================================
-- PREREQUISITOS:
--   1. El proyecto Supabase debe estar creado (auth.users existe)
--   2. Ejecutar este script en Supabase SQL Editor como superuser
--   3. La extensión "uuid-ossp" o "pgcrypto" debe estar disponible
--
-- ORDEN: Las tablas están ordenadas por dependencia de FK.
--        No se crea una tabla antes que sus referencias.
--
-- QUÉ INCLUYE:
--   - 35 tablas con comentarios
--   - Índices sobre FK y columnas de consulta frecuente
--   - RLS habilitado + políticas básicas
--   - Funciones SECURITY DEFINER para signup y setup-company
--   - Triggers para updated_at
--   - Datos semilla (roles)
--
-- DISCREPANCIAS CORREGIDAS (respecto a versión anterior):
--   - analytes.name: agregado (el código hace select('id, scientific_name, name'))
--   - reports.status: agregado 'generated' al CHECK (el código lo usa)
--   - PKs sin DEFAULT: action_logs, role_views, permissions, sample_audit_logs, views
--     ahora usan GENERATED ALWAYS AS IDENTITY
-- ============================================================================

-- ============================================================================
-- EXTENSIONES
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECUENCIAS (para PKs bigint)
-- ============================================================================
CREATE SEQUENCE IF NOT EXISTS analytes_id_seq;
CREATE SEQUENCE IF NOT EXISTS methods_id_seq;
CREATE SEQUENCE IF NOT EXISTS sla_policies_id_seq;
CREATE SEQUENCE IF NOT EXISTS species_id_seq;
CREATE SEQUENCE IF NOT EXISTS test_catalog_id_seq;
CREATE SEQUENCE IF NOT EXISTS tissues_id_seq;
CREATE SEQUENCE IF NOT EXISTS units_profile_fields_id_seq;
CREATE SEQUENCE IF NOT EXISTS units_profiles_id_seq;
CREATE SEQUENCE IF NOT EXISTS varieties_id_seq;

-- ============================================================================
-- 1. TABLAS SIN DEPENDENCIAS (catálogos base)
-- ============================================================================

-- Almacena las empresas (tenants) del sistema multi-tenant.
-- Cada usuario, cliente, muestra y reporte pertenece a una company.
CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.companies IS 'Empresas (tenants). Raíz del aislamiento multi-tenant.';
COMMENT ON COLUMN public.companies.name IS 'Nombre comercial de la empresa o laboratorio.';

-- Roles del sistema. Controlan acceso a rutas y funcionalidades.
-- admin: control total sobre su company
-- validador: puede validar resultados y generar reportes
-- comun: ingresa resultados, ve datos de su company
-- consumidor: acceso limitado a /reports (portal cliente)
CREATE TABLE public.roles (
  id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
  name text NOT NULL UNIQUE CHECK (name = ANY (ARRAY['admin'::text, 'validador'::text, 'comun'::text, 'consumidor'::text])),
  level integer NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.roles IS 'Roles del sistema. Definen permisos y vistas.';
COMMENT ON COLUMN public.roles.level IS 'Nivel jerárquico (mayor = más privilegios).';

-- Especies vegetales (catálogo compartido entre companies).
CREATE TABLE public.species (
  id bigint NOT NULL DEFAULT nextval('species_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  CONSTRAINT species_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.species IS 'Catálogo de especies vegetales. Compartido globalmente.';

-- Variedades por especie.
CREATE TABLE public.varieties (
  id bigint NOT NULL DEFAULT nextval('varieties_id_seq'::regclass),
  species_id bigint NOT NULL,
  name text NOT NULL,
  CONSTRAINT varieties_pkey PRIMARY KEY (id),
  CONSTRAINT varieties_species_id_fkey FOREIGN KEY (species_id) REFERENCES public.species(id)
);
COMMENT ON TABLE public.varieties IS 'Variedades vegetales. Cada una pertenece a una especie.';

-- Tejidos vegetales (catálogo compartido).
CREATE TABLE public.tissues (
  id bigint NOT NULL DEFAULT nextval('tissues_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  CONSTRAINT tissues_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.tissues IS 'Catálogo de tejidos vegetales.';

-- Perfiles de unidades de medida (ej: "Recuento de nematodos", "Peso seco").
CREATE TABLE public.units_profiles (
  id bigint NOT NULL DEFAULT nextval('units_profiles_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  CONSTRAINT units_profiles_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.units_profiles IS 'Perfiles de unidades de medida para sample_units.';

-- Campos que componen cada perfil de unidad.
CREATE TABLE public.units_profile_fields (
  id bigint NOT NULL DEFAULT nextval('units_profile_fields_id_seq'::regclass),
  units_profile_id bigint NOT NULL,
  field_name text NOT NULL,
  unit text,
  type text NOT NULL DEFAULT 'numeric'::text CHECK (type = ANY (ARRAY['int'::text, 'numeric'::text, 'text'::text, 'bool'::text])),
  CONSTRAINT units_profile_fields_pkey PRIMARY KEY (id),
  CONSTRAINT units_profile_fields_units_profile_id_fkey FOREIGN KEY (units_profile_id) REFERENCES public.units_profiles(id)
);
COMMENT ON TABLE public.units_profile_fields IS 'Campos que definen la estructura de un units_profile.';

-- Vistas del sistema (nav items, secciones).
CREATE TABLE public.views (
  id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
  name text NOT NULL UNIQUE,
  label text,
  path text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT views_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.views IS 'Vistas/secciones del sistema usadas para control de acceso por rol.';

-- Relación muchos-a-muchos entre roles y views.
CREATE TABLE public.role_views (
  id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
  role_id integer,
  view_id integer,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT role_views_pkey PRIMARY KEY (id),
  CONSTRAINT role_views_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id),
  CONSTRAINT role_views_view_id_fkey FOREIGN KEY (view_id) REFERENCES public.views(id)
);
COMMENT ON TABLE public.role_views IS 'Asignación de vistas a roles.';

-- Permisos granulares por rol.
CREATE TABLE public.permissions (
  id integer NOT NULL GENERATED ALWAYS AS IDENTITY,
  role_id integer,
  action text NOT NULL,
  allowed boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT permissions_pkey PRIMARY KEY (id),
  CONSTRAINT permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);
COMMENT ON TABLE public.permissions IS 'Permisos específicos por rol (acciones allow/deny).';

-- Políticas SLA. Definen tiempos de entrega por tipo de análisis.
CREATE TABLE public.sla_policies (
  id bigint NOT NULL DEFAULT nextval('sla_policies_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  business_days integer NOT NULL CHECK (business_days > 0),
  area text CHECK (area = ANY (ARRAY['nematologia'::text, 'fitopatologia'::text, 'virologia'::text, 'deteccion_precoz'::text])),
  CONSTRAINT sla_policies_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.sla_policies IS 'Políticas de SLA: días hábiles por tipo de análisis.';
COMMENT ON COLUMN public.sla_policies.business_days IS 'Días hábiles para completar el análisis.';

-- Analitos (patógenos, virus, hongos, etc. que se pueden detectar).
CREATE TABLE public.analytes (
  id bigint NOT NULL DEFAULT nextval('analytes_id_seq'::regclass),
  code text UNIQUE,
  scientific_name text NOT NULL,
  name text,
  type text NOT NULL CHECK (type = ANY (ARRAY['virus'::text, 'hongo'::text, 'nematodo'::text, 'bacteria'::text, 'abiotico'::text])),
  CONSTRAINT analytes_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.analytes IS 'Catálogo de analitos (patógenos detectables).';
COMMENT ON COLUMN public.analytes.scientific_name IS 'Nombre científico (ej: Meloidogyne incognita).';
COMMENT ON COLUMN public.analytes.name IS 'Nombre común o de display (ej: Nematodo agallador).';
COMMENT ON COLUMN public.analytes.code IS 'Código interno de laboratorio.';

-- Reglas de interpretación automática de resultados.
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
COMMENT ON TABLE public.interpretation_rules IS 'Reglas para interpretación automática de resultados numéricos.';
COMMENT ON COLUMN public.interpretation_rules.comparator IS 'Operador de comparación contra threshold_json.';
COMMENT ON COLUMN public.interpretation_rules.severity IS 'Severidad del mensaje generado.';

-- Notificaciones (cola genérica, múltiples canales).
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
COMMENT ON TABLE public.notifications IS 'Cola de notificaciones multicanal.';

-- ============================================================================
-- 2. TABLAS QUE DEPENDEN DE CATÁLOGOS
-- ============================================================================

-- Métodos de laboratorio.
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
COMMENT ON TABLE public.methods IS 'Catálogo de métodos de laboratorio.';
COMMENT ON COLUMN public.methods.matrix IS 'Tipo de matriz a la que se aplica este método.';
COMMENT ON COLUMN public.methods.sop_url IS 'URL al procedimiento operativo estándar.';

-- Catálogo de tests (tipos de análisis que se pueden solicitar).
CREATE TABLE public.test_catalog (
  id bigint NOT NULL DEFAULT nextval('test_catalog_id_seq'::regclass),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  area text NOT NULL CHECK (area = ANY (ARRAY['nematologia'::text, 'fitopatologia'::text, 'virologia'::text, 'deteccion_precoz'::text, 'bacteriologia'::text])),
  default_method_id bigint,
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT test_catalog_pkey PRIMARY KEY (id),
  CONSTRAINT test_catalog_default_method_id_fkey FOREIGN KEY (default_method_id) REFERENCES public.methods(id)
);
COMMENT ON TABLE public.test_catalog IS 'Catálogo de tipos de análisis. El área determina el builder PDFMonkey.';
COMMENT ON COLUMN public.test_catalog.area IS 'Área de laboratorio (define tipo de reporte y flujo de trabajo).';

-- Relación muchos-a-muchos entre tests y métodos.
CREATE TABLE public.test_method_map (
  test_id bigint NOT NULL,
  method_id bigint NOT NULL,
  CONSTRAINT test_method_map_pkey PRIMARY KEY (test_id, method_id),
  CONSTRAINT test_method_map_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.test_catalog(id),
  CONSTRAINT test_method_map_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.methods(id)
);
COMMENT ON TABLE public.test_method_map IS 'Mapeo N:M entre tests del catálogo y métodos aplicables.';

-- ============================================================================
-- 3. TABLAS DE NEGOCIO (dependen de companies)
-- ============================================================================

-- Clientes (agricultores, empresas, instituciones).
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_id uuid,
  name text NOT NULL,
  rut text NOT NULL CHECK (length(rut) > 8),
  contact_email text,
  phone text,
  address text,
  client_type text CHECK (client_type = ANY (ARRAY['farmer'::text, 'agricultural_company'::text, 'research_institution'::text, 'government_agency'::text, 'consultant'::text])),
  created_at timestamp with time zone DEFAULT now(),
  observation boolean NOT NULL DEFAULT false,
  CONSTRAINT clients_pkey PRIMARY KEY (id),
  CONSTRAINT clients_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id)
);
COMMENT ON TABLE public.clients IS 'Clientes del laboratorio. Pertenece a una company.';
COMMENT ON COLUMN public.clients.observation IS 'Flag: cliente requiere observación especial.';

-- Proyectos (agrupan muestras).
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
COMMENT ON TABLE public.projects IS 'Proyectos que agrupan muestras. Pertenece a una company.';

-- ============================================================================
-- 4. USUARIOS (depende de auth.users de Supabase + companies + clients + roles)
-- ============================================================================

-- Perfil de usuario en el esquema public.
-- Extiende auth.users (GoTrue). La FK users.id -> auth.users.id es la unión.
-- Un usuario sin company_id es un usuario recién registrado (pre-onboarding).
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
  CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT users_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id)
);
COMMENT ON TABLE public.users IS 'Perfil de usuario en el dominio LIMS. Extiende auth.users.';
COMMENT ON COLUMN public.users.company_id IS 'NULL hasta que el usuario complete el onboarding (setup-company).';
COMMENT ON COLUMN public.users.client_id IS 'Cliente asociado si el usuario es tipo consumidor/cliente.';

-- ============================================================================
-- 5. MUESTRAS Y SUS DEPENDENCIAS
-- ============================================================================

-- Muestras recibidas en el laboratorio.
-- Tabla central: casi todo el flujo de trabajo gira alrededor de samples.
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
  sampling_method text DEFAULT ''::text,
  CONSTRAINT samples_pkey PRIMARY KEY (id),
  CONSTRAINT samples_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT samples_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT samples_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id)
);
COMMENT ON TABLE public.samples IS 'Muestras. Tabla central del sistema.';
COMMENT ON COLUMN public.samples.code IS 'Código único de muestra (ej: S-2026-001).';
COMMENT ON COLUMN public.samples.status IS 'Estado en el flujo de trabajo del laboratorio.';
COMMENT ON COLUMN public.samples.sla_status IS 'Estado respecto al SLA (on_time, at_risk, breached).';
COMMENT ON COLUMN public.samples.taken_by IS 'Quién tomó la muestra: cliente o personal de laboratorio.';

-- Auditoría de cambios en muestras.
CREATE TABLE public.sample_audit_logs (
  id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
  sample_id uuid,
  user_id uuid,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sample_audit_logs_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.sample_audit_logs IS 'Registro de auditoría de cambios en muestras.';

-- Archivos adjuntos a muestras (fotos, formularios, etc.).
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
COMMENT ON TABLE public.sample_files IS 'Archivos adjuntos a muestras (storage URL).';

-- Historial de transiciones de estado de muestras.
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
COMMENT ON TABLE public.sample_status_transitions IS 'Historial de cambios de estado de cada muestra.';

-- Tests asignados a cada muestra.
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
COMMENT ON TABLE public.sample_tests IS 'Tests solicitados para cada muestra (N:M samples <-> test_catalog).';

-- Unidades de medida por muestra.
CREATE TABLE public.sample_units (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sample_id uuid NOT NULL,
  code text,
  label text,
  CONSTRAINT sample_units_pkey PRIMARY KEY (id),
  CONSTRAINT sample_units_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.samples(id)
);
COMMENT ON TABLE public.sample_units IS 'Unidades de medida/numeración asignadas a una muestra.';

-- ============================================================================
-- 6. REPORTES (antes de results por FK circular: results -> reports)
-- ============================================================================

-- Templates de reporte.
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
COMMENT ON TABLE public.report_templates IS 'Templates de reporte (estructura y schema).';
COMMENT ON COLUMN public.report_templates.schema_json IS 'Definición JSON del schema del template.';

-- Reportes generados.
-- NOTA: reports.status incluye 'generated' (el código lo usa). Corregido respecto al schema anterior.
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid,
  company_id uuid,
  delivery_date date,
  template text CHECK (template = ANY (ARRAY['standard'::text, 'regulatory'::text, 'summary'::text, 'detailed'::text])),
  generated_by uuid,
  completed boolean DEFAULT false,
  responsible_id uuid,
  status text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'generated'::text, 'validated'::text, 'sent'::text])),
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
  visibility text NOT NULL DEFAULT 'internal'::text CHECK (visibility = ANY (ARRAY['internal'::text, 'client'::text])),
  test_areas text[] DEFAULT '{}'::text[],
  payment boolean DEFAULT false,
  invoice_number text CHECK (length(invoice_number) <= 30),
  payload jsonb,
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT reports_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT reports_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.users(id),
  CONSTRAINT reports_responsible_id_fkey FOREIGN KEY (responsible_id) REFERENCES public.users(id),
  CONSTRAINT reports_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.report_templates(id),
  CONSTRAINT reports_supersedes_report_id_fkey FOREIGN KEY (supersedes_report_id) REFERENCES public.reports(id)
);
COMMENT ON TABLE public.reports IS 'Reportes generados. Un reporte agrupa uno o más resultados.';
COMMENT ON COLUMN public.reports.status IS 'Ciclo de vida: draft -> generated -> validated -> sent.';
COMMENT ON COLUMN public.reports.test_areas IS 'Áreas de análisis incluidas en el reporte.';
COMMENT ON COLUMN public.reports.payload IS 'Payload completo enviado a PDFMonkey (para regeneración).';
COMMENT ON COLUMN public.reports.rendered_pdf_url IS 'URL del PDF generado por PDFMonkey.';

-- Assets incluidos en reportes (imágenes, tablas).
CREATE TABLE public.report_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  file_url text NOT NULL,
  type text NOT NULL DEFAULT 'raw'::text CHECK (type = ANY (ARRAY['image'::text, 'table'::text, 'raw'::text])),
  CONSTRAINT report_assets_pkey PRIMARY KEY (id),
  CONSTRAINT report_assets_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id)
);
COMMENT ON TABLE public.report_assets IS 'Assets adjuntos a reportes (imágenes, tablas, archivos).';

-- ============================================================================
-- 7. RESULTADOS
-- ============================================================================

-- Resultados de análisis.
-- Un resultado pertenece a una muestra y a un test específico de esa muestra.
-- Se relaciona opcionalmente con un reporte (resultados agrupados en reporte).
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
  CONSTRAINT results_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.users(id),
  CONSTRAINT results_validated_by_fkey FOREIGN KEY (validated_by) REFERENCES public.users(id),
  CONSTRAINT results_sample_test_id_fkey FOREIGN KEY (sample_test_id) REFERENCES public.sample_tests(id),
  CONSTRAINT results_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.samples(id),
  CONSTRAINT results_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id)
);
COMMENT ON TABLE public.results IS 'Resultados de análisis. Un resultado por cada test de cada muestra.';
COMMENT ON COLUMN public.results.findings IS 'Hallazgos en JSON (tests, microorganisms, nematodes, methodologies).';
COMMENT ON COLUMN public.results.status IS 'pending: recién creado, completed: finalizado, validated: validado.';
COMMENT ON COLUMN public.results.report_id IS 'Reporte al que pertenece este resultado (NULL si no se ha incluido en reporte).';

-- Resultados numéricos por unidad de medida.
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
  CONSTRAINT unit_results_method_id_fkey FOREIGN KEY (method_id) REFERENCES public.methods(id),
  CONSTRAINT unit_results_sample_unit_id_fkey FOREIGN KEY (sample_unit_id) REFERENCES public.sample_units(id)
);
COMMENT ON TABLE public.unit_results IS 'Resultados numéricos por unidad de medida (ej: recuento de nematodos).';
COMMENT ON COLUMN public.unit_results.result_flag IS 'Flag cualitativo: positivo, negativo, no aplica.';

-- ============================================================================
-- 8. TABLAS RESTANTES
-- ============================================================================

-- Interpretaciones aplicadas a muestras (resultados de evaluation_rules).
CREATE TABLE public.applied_interpretations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sample_id uuid NOT NULL,
  rule_id uuid NOT NULL,
  message text NOT NULL,
  severity text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT applied_interpretations_pkey PRIMARY KEY (id),
  CONSTRAINT applied_interpretations_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.interpretation_rules(id),
  CONSTRAINT applied_interpretations_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.samples(id)
);
COMMENT ON TABLE public.applied_interpretations IS 'Resultados de aplicar interpretation_rules a muestras.';

-- Invitaciones a colaboradores o clientes.
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
  CONSTRAINT invitations_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT invitations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id)
);
COMMENT ON TABLE public.invitations IS 'Invitaciones por email para unirse a una company.';
COMMENT ON COLUMN public.invitations.token IS 'Token único para aceptar la invitación.';

-- Registro de auditoría de acciones.
-- NOTA: action_logs NO tiene FKs formales a users/companies.
-- Esto es intencional: permite retener registros tras eliminación de usuarios/companies.
CREATE TABLE public.action_logs (
  id bigint NOT NULL GENERATED ALWAYS AS IDENTITY,
  user_id uuid,
  company_id uuid,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT action_logs_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.action_logs IS 'Registro de auditoría. Sin FKs para retener datos históricos.';

-- ============================================================================
-- ÍNDICES
-- ============================================================================
-- FK columns (join performance)
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_samples_company_id ON public.samples(company_id);
CREATE INDEX IF NOT EXISTS idx_samples_client_id ON public.samples(client_id);
CREATE INDEX IF NOT EXISTS idx_samples_project_id ON public.samples(project_id);
CREATE INDEX IF NOT EXISTS idx_samples_status ON public.samples(status);
CREATE INDEX IF NOT EXISTS idx_samples_sla_status ON public.samples(sla_status);
CREATE INDEX IF NOT EXISTS idx_samples_code ON public.samples(code);
CREATE INDEX IF NOT EXISTS idx_sample_tests_sample_id ON public.sample_tests(sample_id);
CREATE INDEX IF NOT EXISTS idx_sample_tests_test_id ON public.sample_tests(test_id);
CREATE INDEX IF NOT EXISTS idx_sample_units_sample_id ON public.sample_units(sample_id);
CREATE INDEX IF NOT EXISTS idx_results_sample_id ON public.results(sample_id);
CREATE INDEX IF NOT EXISTS idx_results_sample_test_id ON public.results(sample_test_id);
CREATE INDEX IF NOT EXISTS idx_results_report_id ON public.results(report_id);
CREATE INDEX IF NOT EXISTS idx_results_performed_by ON public.results(performed_by);
CREATE INDEX IF NOT EXISTS idx_results_status ON public.results(status);
CREATE INDEX IF NOT EXISTS idx_results_test_area ON public.results(test_area);
CREATE INDEX IF NOT EXISTS idx_results_created_at ON public.results(created_at);
CREATE INDEX IF NOT EXISTS idx_unit_results_sample_unit_id ON public.unit_results(sample_unit_id);
CREATE INDEX IF NOT EXISTS idx_reports_company_id ON public.reports(company_id);
CREATE INDEX IF NOT EXISTS idx_reports_client_id ON public.reports(client_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_generated_by ON public.reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at);
CREATE INDEX IF NOT EXISTS idx_sample_files_sample_id ON public.sample_files(sample_id);
CREATE INDEX IF NOT EXISTS idx_invitations_company_id ON public.invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_action_logs_company_id ON public.action_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_user_id ON public.action_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON public.action_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_test_catalog_area ON public.test_catalog(area);
CREATE INDEX IF NOT EXISTS idx_test_catalog_active ON public.test_catalog(active);
CREATE INDEX IF NOT EXISTS idx_methods_code ON public.methods(code);
CREATE INDEX IF NOT EXISTS idx_analytes_type ON public.analytes(type);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS en tablas principales con datos multi-tenant
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sample_status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interpretation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applied_interpretations ENABLE ROW LEVEL SECURITY;

-- Función helper: retorna el company_id del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid();
$$;

-- Función helper: verifica si el usuario autenticado es admin de su company
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = auth.uid() AND r.name = 'admin'
  );
$$;

-- Políticas RLS: companies
CREATE POLICY "Users can view their own company" ON public.companies
  FOR SELECT USING (id = public.get_user_company_id());

CREATE POLICY "Admins can update their company" ON public.companies
  FOR UPDATE USING (public.is_admin() AND id = public.get_user_company_id());

-- Políticas RLS: users
CREATE POLICY "Users can view members of their company" ON public.users
  FOR SELECT USING (company_id = public.get_user_company_id() OR id = auth.uid());

CREATE POLICY "Admins can insert users" ON public.users
  FOR INSERT WITH CHECK (public.is_admin() OR id = auth.uid());

CREATE POLICY "Admins can update users in their company" ON public.users
  FOR UPDATE USING (public.is_admin() AND company_id = public.get_user_company_id());

-- Políticas RLS: clients
CREATE POLICY "Company members can view clients" ON public.clients
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins and validadores can insert clients" ON public.clients
  FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Admins and validadores can update clients" ON public.clients
  FOR UPDATE USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can delete clients" ON public.clients
  FOR DELETE USING (public.is_admin() AND company_id = public.get_user_company_id());

-- Políticas RLS: projects
CREATE POLICY "Company members can view projects" ON public.projects
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins and validadores can manage projects" ON public.projects
  FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Admins and validadores can update projects" ON public.projects
  FOR UPDATE USING (company_id = public.get_user_company_id());

-- Políticas RLS: samples
CREATE POLICY "Company members can view samples" ON public.samples
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Company members can insert samples" ON public.samples
  FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Company members can update samples" ON public.samples
  FOR UPDATE USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can delete samples" ON public.samples
  FOR DELETE USING (public.is_admin() AND company_id = public.get_user_company_id());

-- Políticas RLS: sample_tests (acceso via sample -> company_id)
CREATE POLICY "Company members can view sample_tests" ON public.sample_tests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.samples s
      WHERE s.id = sample_tests.sample_id
      AND s.company_id = public.get_user_company_id()
    )
  );

CREATE POLICY "Company members can insert sample_tests" ON public.sample_tests
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.samples s
      WHERE s.id = sample_tests.sample_id
      AND s.company_id = public.get_user_company_id()
    )
  );

-- Políticas RLS: results (acceso via sample -> company_id)
CREATE POLICY "Company members can view results" ON public.results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.samples s
      WHERE s.id = results.sample_id
      AND s.company_id = public.get_user_company_id()
    )
  );

CREATE POLICY "Company members can insert results" ON public.results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.samples s
      WHERE s.id = results.sample_id
      AND s.company_id = public.get_user_company_id()
    )
  );

CREATE POLICY "Company members can update results" ON public.results
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.samples s
      WHERE s.id = results.sample_id
      AND s.company_id = public.get_user_company_id()
    )
  );

CREATE POLICY "Admins can delete results" ON public.results
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.samples s
      WHERE s.id = results.sample_id
      AND s.company_id = public.get_user_company_id()
    )
  );

-- Políticas RLS: reports
CREATE POLICY "Company members can view reports" ON public.reports
  FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins and validadores can insert reports" ON public.reports
  FOR INSERT WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Admins and validadores can update reports" ON public.reports
  FOR UPDATE USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can delete reports" ON public.reports
  FOR DELETE USING (public.is_admin() AND company_id = public.get_user_company_id());

-- Políticas RLS: action_logs
CREATE POLICY "Company members can view their company logs" ON public.action_logs
  FOR SELECT USING (company_id = public.get_user_company_id());

-- Políticas RLS: tablas de catálogo (lectura pública para authenticated)
CREATE POLICY "Authenticated users can view roles" ON public.roles
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view species" ON public.species
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view varieties" ON public.varieties
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view tissues" ON public.tissues
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view methods" ON public.methods
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view test_catalog" ON public.test_catalog
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view analytes" ON public.analytes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view interpretation_rules" ON public.interpretation_rules
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can view sla_policies" ON public.sla_policies
  FOR SELECT USING (true);

-- ============================================================================
-- FUNCIONES SECURITY DEFINER (bypasean RLS para flujos privilegiados)
-- ============================================================================

-- Crea el perfil inicial de un usuario recién registrado.
-- Usada por POST /api/auth/signup (público, sin JWT).
-- GRANT EXECUTE a anon permite que el endpoint de signup la llame.
CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_user_id uuid,
  p_name text,
  p_email text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, name, email)
  VALUES (p_user_id, p_name, p_email);

  RETURN jsonb_build_object(
    'id', p_user_id,
    'name', p_name,
    'email', p_email
  );
END;
$$;

-- Crea una empresa y asigna al usuario como admin.
-- Usada por POST /api/auth/setup-company (con withAuth, usuario ya logueado).
-- Tres operaciones en una transacción: crear company, obtener rol admin, actualizar usuario.
CREATE OR REPLACE FUNCTION public.create_company_and_assign_admin(
  p_user_id uuid,
  p_company_name text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id uuid;
  v_admin_role_id integer;
BEGIN
  -- Crear la empresa
  INSERT INTO public.companies (name)
  VALUES (p_company_name)
  RETURNING id INTO v_company_id;

  -- Obtener el rol admin
  SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'admin';

  IF v_admin_role_id IS NULL THEN
    RAISE EXCEPTION 'Admin role not found. Ejecuta primero el seed de roles.';
  END IF;

  -- Asignar empresa y rol admin al usuario
  UPDATE public.users
  SET company_id = v_company_id,
      role_id = v_admin_role_id,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'company_id', v_company_id,
    'company_name', p_company_name,
    'role', 'admin'
  );
END;
$$;

-- Permisos de ejecución
-- create_user_profile: anon puede (signup sin sesión)
-- create_company_and_assign_admin: solo authenticated (usuario ya logueado)
GRANT EXECUTE ON FUNCTION public.create_user_profile(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_company_and_assign_admin(uuid, text) TO authenticated;

-- ============================================================================
-- TRIGGERS: actualizar updated_at automáticamente
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Tablas que tienen updated_at
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_samples_updated_at
  BEFORE UPDATE ON public.samples
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_results_updated_at
  BEFORE UPDATE ON public.results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- DATOS SEMILLA
-- ============================================================================

-- Roles base del sistema
INSERT INTO public.roles (name, level, description) VALUES
  ('admin', 100, 'Control total sobre la empresa. Gestiona usuarios, muestras, reportes y configuración.'),
  ('validador', 75, 'Valida resultados y genera reportes. Puede crear/editar muestras y clientes.'),
  ('comun', 50, 'Usuario estándar. Ingresa resultados y ve datos de su empresa.'),
  ('consumidor', 10, 'Acceso limitado al portal de reportes. Solo ve reportes asignados.')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
-- Revisar que no haya errores:
--   SELECT 'Tablas creadas: ' || COUNT(*)::text FROM information_schema.tables WHERE table_schema = 'public';
--   SELECT 'Políticas RLS: ' || COUNT(*)::text FROM pg_policies WHERE schemaname = 'public';
--   SELECT 'Funciones: ' || COUNT(*)::text FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public';
