## Problema

Boa parte dos "Ausentes no XML" são CTe (Conhecimento de Transporte — frete), não NF-e. Eles entram na planilha de ICMS pelo CFOP 2353 (e similares de frete), mas nunca terão XML de NF-e correspondente, poluindo o confronto.

## Solução

Detectar a coluna **CFOP** na planilha (provavelmente AG no RFS008) e **ignorar linhas de frete/CTe** antes do confronto, para que não apareçam como ausentes.

### CFOPs a excluir (frete / serviço de transporte)

Lista padrão tratada como CTe:
- `1352`, `2352`, `3352` — aquisição de serviço de transporte por industrial
- `1353`, `2353`, `3353` — aquisição de serviço de transporte por comercial
- `1356`, `2356` — aquisição de serviço de transporte (combustível/lubrif.)
- `1360`, `2360` — aquisição de serviço de transporte (substituto)
- `1932`, `2932` — aquisição de serviço de transporte iniciado em UF diversa

Se preferir só `2353` por enquanto, ajustamos a constante.

## Mudanças técnicas

**`src/lib/excel-parser.ts`**
1. Adicionar `cfop: number` ao `ColumnMap` (em `src/lib/types.ts` opcionalmente expor `cfop` em `ExcelNfeData`, mas pode ficar interno).
2. Em `mapColumns`, detectar header contendo `cfop` ou `c.f.o.p`.
3. Em `parseSheet`, após extrair a linha, se `colMap.cfop >= 0` e o CFOP estiver na lista de CFOPs de frete, **pular a linha** (não incluir nos resultados).
4. Constante exportada `CFOPS_FRETE_IGNORADOS = new Set(['1352','2352','1353','2353', ...])` no topo do arquivo.

Não precisa migration nem mudança em RLS. Confronto e fechamentos existentes não são afetados — só novos uploads passam a filtrar CTe.

## Observação

Fechamentos já salvos continuam mostrando os CTe como ausentes (foram persistidos). O filtro vale para novos confrontos. Se quiser, posso adicionar um botão "Reprocessar" no fechamento para reaplicar o filtro — me avise.