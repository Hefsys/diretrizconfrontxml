ALTER TABLE public.xmls_armazenados ADD COLUMN IF NOT EXISTS cnpj_dest text;

UPDATE public.xmls_armazenados
SET cnpj_dest = NULLIF(regexp_replace(COALESCE(xml_data->>'cnpjDest',''), '[^0-9]', '', 'g'), '')
WHERE cnpj_dest IS NULL;