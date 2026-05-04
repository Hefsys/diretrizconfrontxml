DROP POLICY IF EXISTS "Authors or admins can update fechamentos" ON public.fechamentos_mensais;

CREATE POLICY "Authenticated can update fechamentos"
ON public.fechamentos_mensais
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);