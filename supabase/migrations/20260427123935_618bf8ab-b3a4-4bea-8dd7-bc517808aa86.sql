-- 1. Add IPI flag to empresas
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS soma_ipi_dealernet boolean NOT NULL DEFAULT false;

-- 2. Stored XMLs (per company)
CREATE TABLE IF NOT EXISTS public.xmls_armazenados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  ch_nfe text NOT NULL,
  n_nf text,
  serie text,
  dh_emi text,
  cnpj_emitente text,
  x_nome text,
  v_nf numeric,
  v_ipi numeric,
  cancelada boolean NOT NULL DEFAULT false,
  xml_data jsonb NOT NULL,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, ch_nfe)
);

CREATE INDEX IF NOT EXISTS idx_xmls_armazenados_empresa ON public.xmls_armazenados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_xmls_armazenados_n_nf ON public.xmls_armazenados(n_nf);

ALTER TABLE public.xmls_armazenados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view xmls"
  ON public.xmls_armazenados FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert xmls"
  ON public.xmls_armazenados FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Authenticated can update xmls"
  ON public.xmls_armazenados FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete xmls"
  ON public.xmls_armazenados FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_xmls_armazenados_updated_at
  BEFORE UPDATE ON public.xmls_armazenados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Monthly closings
CREATE TABLE IF NOT EXISTS public.fechamentos_mensais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  competencia text NOT NULL,
  fechado_por uuid,
  fechado_em timestamptz NOT NULL DEFAULT now(),
  resumo jsonb NOT NULL,
  resultados jsonb NOT NULL,
  UNIQUE (empresa_id, competencia)
);

CREATE INDEX IF NOT EXISTS idx_fechamentos_empresa ON public.fechamentos_mensais(empresa_id);

ALTER TABLE public.fechamentos_mensais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view fechamentos"
  ON public.fechamentos_mensais FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can create fechamentos"
  ON public.fechamentos_mensais FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = fechado_por);

CREATE POLICY "Admins can delete fechamentos"
  ON public.fechamentos_mensais FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));