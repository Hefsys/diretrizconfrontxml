DROP POLICY IF EXISTS "Uploader or admin can update xmls" ON public.xmls_armazenados;
CREATE POLICY "Authenticated can update xmls" ON public.xmls_armazenados FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Uploader or admin can update excel linhas" ON public.excel_linhas_armazenadas;
CREATE POLICY "Authenticated can update excel linhas" ON public.excel_linhas_armazenadas FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);