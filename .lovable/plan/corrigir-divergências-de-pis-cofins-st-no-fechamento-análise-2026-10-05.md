# Corrigir divergências de PIS/COFINS ST no fechamento "Análise Set/2026"

## O que encontrei
- Quase todas as notas Yamaha que aparecem como divergentes têm uma diferença exatamente igual a **PIS ST + COFINS ST** do XML. Exemplo: NF 3376009, diferença de R$ 621,78 = PIS 110,73 + COFINS 511,05. O mesmo acontece com as notas 3383795, 3438494 e outras.
- O IPI é zero em todas as notas que conferi, então ele **não** causa as diferenças.
- O sistema já sabe descontar PIS/COFINS ST na comparação, mas o fechamento foi salvo antes dessa correção. Por isso as diferenças antigas continuam aparecendo nele.
- A NF 3492533 (Planilha R$ 62.834,00 x XML R$ 16.821,97) é um caso diferente. Ela não está nesta planilha de setembro, e o valor salvo parece somado indevidamente, como aconteceu com as notas Yamaha do rodapé.

## O que vou fazer
1. Recalcular as notas divergentes do fechamento "Análise Set/2026" usando a regra atual (valor do XML sem PIS/COFINS ST). As que baterem passam para OK, e os totais do resumo são atualizados.
2. Atualizar o valor da planilha desse fechamento com a planilha que você enviou agora, para corrigir valores somados por engano.
3. Conferir a NF 3492533 e as notas Yamaha suspeitas (3397638, 3393911, 3428675, 3464176) e corrigir as que estiverem infladas.
4. Listar as divergências que continuarem depois disso, com o motivo de cada uma (por exemplo, frete ou outro tributo), para você revisar.

Não vou mudar o visual, os campos nem o fluxo do sistema.

## Detalhes técnicos
- Script único que roda `refreshPlanilhaValues` + `valorXmlComparavel` sobre `fechamentos_mensais.resultados` (id f5fbe7f3…), cruzando com `xmls_armazenados` e `excel_linhas_armazenadas`, e regrava `resultados` e `resumo`.
- Corrigir as linhas infladas em `excel_linhas_armazenadas` com os valores da planilha enviada.
