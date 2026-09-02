# Notas Yamaha marcadas como "Divergente" por diferença de FCP-ST

## O que foi confirmado

Comparando a planilha RFS008 (YAMAHA GOIANA filial) com o DANFE da NF 3438494 e o registro já gravado na base:

- Planilha, coluna Valor Contábil: R$ 25.818,65 = 25.160,84 (base ICMS) + 657,81 (ICMS ST)
- XML, valor total da nota (vNF): R$ 26.626,82
- Diferença exibida: R$ 808,17
- No DANFE, o IPI desta nota é **zero** — ou seja, a diferença **não** é IPI
- Os campos hoje extraídos do XML (vProd, frete, seguro, vST, vIPI) não explicam os R$ 808,17; o valor corresponde a um adicional sobre a base de ST (17.937,15), compatível com **FCP-ST**, campo que o sistema ainda não lê

Conclusão: as notas Yamaha saíram de "Ausente no XML" para "Divergente" porque a leitura já funciona, mas a comparação usa o total da nota sem descontar o FCP-ST, que o Dealernet não inclui no Valor Contábil.

## Correção proposta

1. Confirmar a hipótese lendo o campo de FCP-ST do XML original de uma dessas notas (vFCPST no total, e vFCPST dos itens). Se o valor for exatamente 808,17, a causa está confirmada; se não, o ajuste seguinte não é aplicado e o valor residual real é investigado antes de qualquer mudança.
2. Passar a extrair o FCP-ST no leitor de XML e gravá-lo junto com os demais totais.
3. Na comparação, considerar como valor esperado da nota o total menos o FCP-ST, mantendo a tolerância atual de centavos. Assim notas com FCP-ST ficam "OK" e divergências reais continuam sinalizadas.
4. Reaproveitar o "Reprocessar XMLs" existente para preencher o novo campo nos registros já armazenados, e permitir que fechamentos salvos sejam reconciliados novamente com o botão já existente.

As divergências que não são de FCP-ST (por exemplo LWART NF 11609: planilha R$ 206,00 x XML R$ 47,00, e NF 11610) permanecem como Divergente — são diferenças reais de escrituração.

## Detalhes técnicos

- `src/lib/xml-parser.ts`: ler `vFCPST` (e somar `vFCPST` dos itens como fallback) dentro de `ICMSTot`, expondo no tipo do XML.
- `src/lib/types.ts`: novo campo opcional `vFCPST`.
- `src/lib/confronto-engine.ts`: introduzir `valorComparavel(xml) = vNF - (vFCPST ?? 0)` e usar em todos os pontos de comparação/diferença (`runConfronto`, `reconcileMissing`, `reconcileExcel`), sem alterar layout nem os demais status.
- `src/lib/xml-storage.ts`: incluir o campo no upsert; registros antigos ficam com 0 até reprocessar.
- Nenhuma mudança de UI, identidade visual, rotas ou fluxo.
