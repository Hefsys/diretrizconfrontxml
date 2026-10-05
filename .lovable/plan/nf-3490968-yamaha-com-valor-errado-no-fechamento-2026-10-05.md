# NF 3490968 (Yamaha) com valor errado no fechamento

## O que encontrei
- Planilha (linha da NF): Valor Contábil R$ 53.241,07 (= 52.630,26 + ICMS ST RET 610,81).
- XML: vNF R$ 54.913,93. A diferença (R$ 1.672,86) é exatamente PIS R$ 297,91 + COFINS R$ 1.374,95, que o Dealernet não soma.
- Problema principal: a NF 3490968 é a última do relatório. Logo depois vem a linha "Total" e uma linha de total geral "ICMS ST RET ENTRADA = R$ 210.752,88". O sistema trata essa linha de total como continuação da Yamaha e soma R$ 210.752,88 ao valor da nota.

## Correções
1. Leitura da planilha: ao encontrar uma linha "Total", parar de somar continuações na nota anterior. Linhas de total nunca entram na soma da coluna AR.
2. Comparação do valor: aceitar também "vNF - PIS - COFINS" como valor equivalente ao da planilha (só quando bate), para notas Yamaha como esta não aparecerem como divergentes.
3. Corrigir a linha já salva da NF 3490968 na base de planilhas (valor volta para R$ 53.241,07) e procurar outras notas que terminaram antes de uma linha "Total" com o mesmo problema.

Depois disso, basta abrir o fechamento e clicar em "Reconciliar com a base" (ou reenviar esta planilha) para a nota ficar OK.

## Detalhes técnicos
- `src/lib/excel-parser.ts`: zerar o ponteiro de "última NF" quando alguma célula da linha for "Total"/"Total:".
- `src/lib/confronto-engine.ts` (`valorXmlComparavel`): novo candidato `vNF - vPIS - vCOFINS`.
- Ajuste de dados em `excel_linhas_armazenadas` para a NF 3490968.
