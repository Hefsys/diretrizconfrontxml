
-- 1) Atualiza snapshots: para cada fechamento, transforma linhas Yamaha
--    divergentes (onde valorXml > valorPlanilha) em OK com valor corrigido.
DO $$
DECLARE
  fech RECORD;
  novos_resultados jsonb;
  novo_resumo jsonb;
  ok_count int;
  div_count int;
  aus_count int;
  ne_count int;
  canc_count int;
  total_plan int;
  total_xml int;
BEGIN
  FOR fech IN
    SELECT id, resultados FROM public.fechamentos_mensais
  LOOP
    SELECT jsonb_agg(
      CASE
        WHEN r->>'cnpjEmitente' = '04817052000106'
         AND r->>'status' = 'divergente'
         AND (r->>'valorXml') IS NOT NULL
         AND (r->>'valorPlanilha') IS NOT NULL
         AND (r->>'valorXml')::numeric > (r->>'valorPlanilha')::numeric
        THEN
          r
            || jsonb_build_object(
                 'status', 'ok',
                 'valorPlanilha', (r->>'valorXml')::numeric,
                 'diferenca', 0
               )
        ELSE r
      END
    )
    INTO novos_resultados
    FROM jsonb_array_elements(fech.resultados) r;

    IF novos_resultados IS DISTINCT FROM fech.resultados THEN
      SELECT
        count(*) FILTER (WHERE r->>'status' = 'ok'),
        count(*) FILTER (WHERE r->>'status' = 'divergente'),
        count(*) FILTER (WHERE r->>'status' = 'ausente_xml'),
        count(*) FILTER (WHERE r->>'status' = 'nao_escriturado'),
        count(*) FILTER (WHERE r->>'status' = 'cancelada'),
        count(*) FILTER (WHERE r->>'valorPlanilha' IS NOT NULL AND r->>'valorPlanilha' <> 'null'),
        count(*) FILTER (WHERE r->>'valorXml' IS NOT NULL AND r->>'valorXml' <> 'null')
      INTO ok_count, div_count, aus_count, ne_count, canc_count, total_plan, total_xml
      FROM jsonb_array_elements(novos_resultados) r;

      novo_resumo := jsonb_build_object(
        'totalPlanilha', total_plan,
        'totalXmls', total_xml,
        'ok', ok_count,
        'divergentes', div_count,
        'ausentes', aus_count,
        'naoEscriturados', ne_count,
        'canceladas', canc_count
      );

      UPDATE public.fechamentos_mensais
        SET resultados = novos_resultados,
            resumo = novo_resumo
        WHERE id = fech.id;
    END IF;
  END LOOP;
END $$;

-- 2) Atualiza base histórica de Excel: usa o valor do XML como valor_contabil
--    quando a linha Yamaha tem o mesmo nNF/CNPJ e está abaixo do XML.
UPDATE public.excel_linhas_armazenadas el
SET valor_contabil = x.v_nf,
    row_data = el.row_data || jsonb_build_object('valorContabil', x.v_nf)
FROM public.xmls_armazenados x
WHERE el.cnpj_emitente = '04817052000106'
  AND x.cnpj_emitente = '04817052000106'
  AND el.empresa_id = x.empresa_id
  AND el.n_nf = x.n_nf
  AND x.v_nf IS NOT NULL
  AND el.valor_contabil IS NOT NULL
  AND x.v_nf > el.valor_contabil
  AND x.v_nf - el.valor_contabil < 5000;
