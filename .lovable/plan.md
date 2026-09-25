# NF 34752 (Bremen) continua "Ausente" no fechamento

## O que foi verificado
- O XML está salvo na base e já aparece no fechamento "Análise Set/2026 — 25/09/2026". Hoje ele fica numa linha separada, como "Não escriturado", com valor de R$ 91,69.
- A linha da planilha tem a mesma NF 34752, série 1 e R$ 91,69. Mas o CNPJ dela é **16.355.380/0003-89** (Bremen, outra filial).
- O XML foi emitido por **16.355.380/0019-46** (Bremen Olinda).
- A regra recente só junta pelo número da NF quando o CNPJ é exatamente igual. Ela foi criada para evitar divergências falsas. Como as filiais são diferentes, a nota não é juntada.

## Correção
- Nos casamentos por número da NF, o sistema também vai aceitar o **mesmo grupo de CNPJ** (os 8 primeiros dígitos iguais, ou seja, matriz ou filial da mesma empresa). Para isso, **série e valor precisam bater** (tolerância de 1 centavo).
- Continua proibido juntar notas de empresas diferentes. Assim, as divergências falsas que já foram corrigidas não voltam.
- Ao reconciliar, a linha "Ausente" é juntada com a linha "Não escriturado" do mesmo XML e passa a ficar OK. A linha duplicada é removida.
- Depois, basta clicar em "Reconciliar com a base" no fechamento. O layout e o fluxo não mudam.

## Detalhes técnicos
- `src/lib/confronto-engine.ts`: em `cnpjOkFallback`, aceitar `raiz8(xml.emit|dest) === raiz8(row.cnpj)` apenas quando `serie` coincide e `valorBate` é verdadeiro. Aplicar em `runConfronto`, `reconcileMissing` e `reconcileExcel`.
- Em `reconcileMissing`, ao casar um XML que já aparece como `nao_escriturado`, remover essa linha do resultado.
- Validar a regra com a NF 34752 e com os casos do print anterior (NF 1218/1219, que devem continuar sem casar).
