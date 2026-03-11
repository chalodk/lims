-- Fix: allow DELETE on clients (RLS had no DELETE policy, so deletes appeared to succeed but did nothing)
-- Run this in Supabase SQL Editor if clients still appear after "successful" delete.

DROP POLICY IF EXISTS "Users can delete clients from their company" ON clients;
CREATE POLICY "Users can delete clients from their company" ON clients
  FOR DELETE USING (
    company_id = get_user_company_id() OR is_admin()
  );
