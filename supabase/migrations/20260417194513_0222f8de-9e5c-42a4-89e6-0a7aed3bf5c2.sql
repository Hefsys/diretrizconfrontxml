DROP POLICY IF EXISTS "Authenticated can update empresas" ON public.empresas;

CREATE POLICY "Creators or admins can update empresas"
ON public.empresas FOR UPDATE
TO authenticated
USING (
  auth.uid() = created_by
  OR public.has_role(auth.uid(), 'admin')
);