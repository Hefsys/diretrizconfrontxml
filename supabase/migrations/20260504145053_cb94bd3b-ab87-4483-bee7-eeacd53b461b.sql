DROP POLICY IF EXISTS "Authors or admins can delete fechamentos" ON public.fechamentos_mensais;

CREATE POLICY "Authenticated can delete fechamentos"
ON public.fechamentos_mensais
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);