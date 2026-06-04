## Correção

A regra atual do parser está somando AR **duas vezes** (linha principal + continuação). O correto, confirmado pelo usuário, é:

> **Valor Contábil final = AA (linha principal) + AR (linha de continuação)**

A linha principal AA **já inclui** o AR dela mesma (ICMS ST RET ENTRADA). Só falta somar o AR da linha de continuação (VALOR PIS/COFINS RET).

Validação com NF 3335869: 25.716,03 (AA) + 804,87 (AR continuação) = **26.520,90** ✅

## Mudança

**`src/lib/excel-parser.ts`**
- Remover a soma do AR da própria linha principal para CNPJs em `CNPJS_SOMA_AR` (Yamaha). Manter apenas a soma do AR vindo das linhas de continuação (sem nNF).

Trecho a remover:
```ts
// Para Yamaha & cia, somar AR da própria linha principal ao Valor Contábil.
if (cnpj && CNPJS_SOMA_AR.has(cnpj)) {
  const arVal = parseCell(row[AR_COL_INDEX]);
  if (arVal !== 0) valor = +(valor + arVal).toFixed(2);
}
```

A lógica das linhas de continuação (que soma `AR` ao último registro Yamaha emitido) permanece igual.

## Depois

Você precisa **reenviar a planilha da Yamaha** na aba Excel para que as linhas armazenadas no banco sejam recalculadas com a regra corrigida. Fechamentos já salvos mantêm o snapshot antigo — só novos confrontos passam a usar o valor certo.

## Fora de escopo

- Nenhuma mudança em `confronto-engine.ts`, UI ou banco.
- Outros CNPJs continuam sem regra especial.
