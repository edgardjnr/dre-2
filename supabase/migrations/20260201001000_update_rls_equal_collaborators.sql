DROP POLICY IF EXISTS "Company owners can manage collaborators" ON public.company_collaborators;
CREATE POLICY "Company collaborators can manage collaborators" ON public.company_collaborators
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.company_collaborators WHERE user_id = auth.uid()
    )
  );
