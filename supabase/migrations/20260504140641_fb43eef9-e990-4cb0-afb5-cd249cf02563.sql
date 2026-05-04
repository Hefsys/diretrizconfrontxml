DROP POLICY IF EXISTS "Admins can delete fechamentos" ON public.fechamentos_mensais;

CREATE POLICY "Authors or admins can delete fechamentos"
ON public.fechamentos_mensais
FOR DELETE
TO authenticated
USING (auth.uid() = fechado_por OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Authors or admins can update fechamentos"
ON public.fechamentos_mensais
FOR UPDATE
TO authenticated
USING (auth.uid() = fechado_por OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (auth.uid() = fechado_por OR public.has_role(auth.uid(), 'admin'::public.app_role));