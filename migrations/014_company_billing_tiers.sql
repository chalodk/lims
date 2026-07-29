-- 014: Campos de plan/billing en companies + permitir UPDATE a csx

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'growth',
  ADD COLUMN IF NOT EXISTS billing_notes text NULL,
  ADD COLUMN IF NOT EXISTS plan_updated_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS plan_updated_by uuid NULL REFERENCES public.users(id);

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_plan_tier_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_plan_tier_check
  CHECK (plan_tier IN ('starter', 'growth', 'enterprise'));

COMMENT ON COLUMN public.companies.plan_tier IS 'Tier de uso: starter | growth | enterprise';
COMMENT ON COLUMN public.companies.billing_notes IS 'Notas internas de facturación (contacto, factura, etc.)';
COMMENT ON COLUMN public.companies.plan_updated_at IS 'Última vez que se cambió el plan_tier';
COMMENT ON COLUMN public.companies.plan_updated_by IS 'Usuario que actualizó el plan_tier';

-- csx también puede actualizar companies (plan_tier / billing_notes)
DROP POLICY IF EXISTS "Only admins can update companies" ON public.companies;
CREATE POLICY "Admins and csx can update companies"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (is_admin() OR is_csx())
  WITH CHECK (is_admin() OR is_csx());
