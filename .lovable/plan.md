# Plano para corrigir o fechamento diretamente

## O que vou corrigir

1. Fazer o fechamento salvo aceitar a planilha corrigida como atualização real do snapshot.
2. Garantir que a base histórica da empresa seja atualizada com os novos valores do Excel, em vez de manter os antigos.
3. Validar no app que as notas do print deixam de ficar divergentes quando a planilha corrigida é reaplicada.

## Problema identificado

Hoje existem duas falhas combinadas:

- **O fechamento salvo não recalcula linhas já divergentes**: em `ResultsSection`, ao usar **Adicionar Excel** no detalhe do fechamento, a rotina chama `reconcileExcel(...)`, mas essa função só tenta casar novas linhas com itens `nao_escriturado`. Ela **não revisa** itens já `divergente` ou `ausente_xml` que precisariam trocar `valorPlanilha` e recalcular o status.
- **A base histórica do Excel não é corrigida no reupload**: em `src/lib/excel-storage.ts`, `salvarLinhasExcel()` usa `.upsert(..., { ignoreDuplicates: true })`. Isso faz com que, quando a mesma NF é reenviada com valor corrigido, o registro antigo permaneça e o novo seja ignorado.

Isso explica o comportamento do usuário: o fechamento continua mostrando os valores antigos mesmo após o parser ter sido ajustado.

## Implementação

### 1) Atualizar a gravação das linhas Excel para sobrescrever valores antigos
**Arquivo:** `src/lib/excel-storage.ts`

- Remover `ignoreDuplicates: true` do `upsert`.
- Fazer o `upsert` atualizar os campos da linha já existente com o valor novo (`valor_contabil`, `row_data`, `cfop`, `sheet_name`, datas, etc.).
- Manter a chave de conflito atual (`empresa_id,n_nf,serie,cnpj_emitente,data_documento`) se ela já estiver funcionando no banco.

**Resultado esperado:** ao reenviar uma planilha corrigida, a linha histórica da empresa passa a refletir o valor novo, em vez de prender o sistema no valor antigo.

### 2) Criar reconciliação que também atualiza linhas já divergentes no fechamento
**Arquivo:** `src/lib/confronto-engine.ts`

- Ajustar `reconcileExcel(...)` ou criar uma função específica para “reaplicar Excel no fechamento”.
- Essa rotina deve procurar correspondência para as novas linhas não só em `nao_escriturado`, mas também em:
  - `divergente`
  - `ausente_xml`
  - `ok` (quando o valor de planilha precisa ser substituído e revalidado)
- Critérios de match, na mesma ordem já usada no motor:
  1. `chNFe`
  2. `nNF + CNPJ`
  3. `nNF` único
  4. fallback por `CNPJ + valor aproximado` quando necessário
- Ao encontrar correspondência:
  - substituir `valorPlanilha` pelo novo valor do Excel
  - preencher metadados da linha nova (`sheetName`, `cfop`, etc.)
  - recalcular `status`, `diferenca` e `valorXml`
- Continuar deduplicando no final.

**Resultado esperado:** o botão **Adicionar Excel** dentro de um fechamento salvo passa a corrigir o snapshot existente de verdade.

### 3) Garantir que o detalhe do fechamento persista o snapshot corrigido
**Arquivos:**
- `src/components/ResultsSection.tsx`
- `src/routes/fechamentos_.$fechamentoId.tsx`

- Manter o fluxo atual de `onUpdate`, mas fazer com que ele receba um conjunto já recalculado corretamente.
- Confirmar que, ao processar o Excel no modo `readOnly` com `onUpdate`, o resultado atualizado seja salvo em `fechamentos_mensais.resultados` e `resumo`.
- Se necessário, atualizar o estado local após persistência para a tabela refletir imediatamente os novos números.

## Validação

### Validação funcional
Vou validar com foco no caso do print:

- aplicar Excel corrigido em um fechamento salvo
- conferir que notas como `3364960`, `3364961`, `3364968`, `3364969`, `3364970`, `3368335`, `3368402`, `3368407`, `3370325`, `3372133` e `3376854` deixam de manter o `valorPlanilha` antigo
- verificar se o status e a diferença são recalculados corretamente após a atualização
- confirmar que o snapshot salvo no backend foi atualizado

### Validação técnica
Vou conferir:

- se o `upsert` de Excel agora substitui o valor antigo
- se não há reintrodução de duplicados após reaplicar a planilha
- se o fechamento atualizado continua abrindo normalmente

## Arquivos previstos

- `src/lib/excel-storage.ts`
- `src/lib/confronto-engine.ts`
- `src/components/ResultsSection.tsx` (se precisar ajustar o fluxo)
- `src/routes/fechamentos_.$fechamentoId.tsx` (se precisar ajustar atualização local/persistência)

## Observação importante
O backend já confirma que as NFs do print ainda estão gravadas com os **valores antigos** na base Excel da empresa, então essa correção precisa atuar em **duas camadas**: atualizar o histórico e recalcular o snapshot do fechamento.