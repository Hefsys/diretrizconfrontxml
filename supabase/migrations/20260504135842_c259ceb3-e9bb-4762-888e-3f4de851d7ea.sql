ALTER TABLE public.fechamentos_mensais ADD COLUMN IF NOT EXISTS titulo text;
ALTER TABLE public.fechamentos_mensais DROP CONSTRAINT IF EXISTS fechamentos_mensais_empresa_id_competencia_key;