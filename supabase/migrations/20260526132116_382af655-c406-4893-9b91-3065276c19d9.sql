DROP POLICY IF EXISTS "Creators or admins can update empresas" ON public.empresas;
CREATE POLICY "Authenticated can update empresas"
ON public.empresas
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);