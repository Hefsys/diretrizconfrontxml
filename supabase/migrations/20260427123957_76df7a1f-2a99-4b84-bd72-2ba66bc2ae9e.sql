DROP POLICY IF EXISTS "Authenticated can update xmls" ON public.xmls_armazenados;

CREATE POLICY "Uploader or admin can update xmls"
  ON public.xmls_armazenados FOR UPDATE
  TO authenticated
  USING (auth.uid() = uploaded_by OR public.has_role(auth.uid(), 'admin'::app_role));