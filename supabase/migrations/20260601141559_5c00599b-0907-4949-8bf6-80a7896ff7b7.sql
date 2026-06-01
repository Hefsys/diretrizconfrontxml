CREATE TABLE public.excel_linhas_armazenadas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  n_nf TEXT NOT NULL,
  serie TEXT NOT NULL DEFAULT '',
  cnpj_emitente TEXT NOT NULL DEFAULT '',
  nome_emitente TEXT,
  ch_nfe TEXT,
  data_entrada TEXT,
  data_documento TEXT NOT NULL DEFAULT '',
  competencia TEXT,
  valor_contabil NUMERIC,
  v_bc NUMERIC,
  v_icms NUMERIC,
  v_st NUMERIC,
  cfop TEXT,
  sheet_name TEXT,
  row_data JSONB NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT excel_linhas_unique UNIQUE (empresa_id, n_nf, serie, cnpj_emitente, data_documento)
);

CREATE INDEX idx_excel_linhas_empresa ON public.excel_linhas_armazenadas(empresa_id);
CREATE INDEX idx_excel_linhas_competencia ON public.excel_linhas_armazenadas(empresa_id, competencia);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.excel_linhas_armazenadas TO authenticated;
GRANT ALL ON public.excel_linhas_armazenadas TO service_role;

ALTER TABLE public.excel_linhas_armazenadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view excel linhas"
ON public.excel_linhas_armazenadas
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert excel linhas"
ON public.excel_linhas_armazenadas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Uploader or admin can update excel linhas"
ON public.excel_linhas_armazenadas
FOR UPDATE
TO authenticated
USING ((auth.uid() = uploaded_by) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete excel linhas"
ON public.excel_linhas_armazenadas
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_excel_linhas_updated_at
BEFORE UPDATE ON public.excel_linhas_armazenadas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();