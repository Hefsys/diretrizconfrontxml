# Adicionar Excel no Confronto/Fechamento

## Objetivo

Hoje o `ResultsSection` (usado tanto na tela de Confronto quanto no detalhe do Fechamento) só tem o botão **Adicionar XMLs**. Vamos adicionar um botão simétrico **Adicionar Excel** que faz reconciliação igualzinha à de XMLs.

## Comportamento

O botão abre seletor `.xlsx/.xls`. Depois do parse das linhas selecionadas (mesmo fluxo do `parseSheet` + diálogo de seleção de abas):

1. Salva as novas linhas na base `excel_linhas_armazenadas` da empresa (mesma `salvarLinhasExcel`, ignorando duplicatas).
2. **Reconcilia** com os resultados atuais:
   - Linhas Excel novas que casarem com um XML existente marcado como `nao_escriturado` → reclassifica para `ok` ou `divergente` (compara `valorPlanilha` vs `valorXml`, tolerância 0.01) e preenche dados da planilha.
   - Linhas Excel sem correspondência viram novas entradas com status `ausente_xml` (espelho do que `reconcileMissing` faz com XMLs).
   - Respeita o filtro de mês selecionado (igual ao XML — só reconcilia linhas dentro da competência ativa, ou todas se "todos").
3. Chama `onUpdate(newResults, newSummary)` para persistir no fechamento quando em modo readOnly+onUpdate (mesmo padrão do XML).
4. Toast no mesmo formato: `N nota(s) reconciliada(s) · M linha(s) sem correspondência adicionada(s) como "Ausente no XML" · K linha(s) salva(s) na base da empresa`.

## Detalhes técnicos

**`src/lib/confronto-engine.ts`** — adicionar `reconcileExcel(currentResults, newExcelRows, monthFilter?)`:
- Itera `currentResults` filtrando `status === 'nao_escriturado'` (XMLs sem escrituração) dentro de `monthFilter`.
- Para cada um tenta casar com as novas linhas Excel via mesma escada: chNFe → nNF+CNPJ → nNF único → CNPJ+valor aproximado.
- Match: atualiza `valorPlanilha`, `diferenca`, `status` (`ok` ou `divergente`), preserva `valorXml`/`chNFe`/`nomeEmitente` já presentes.
- Linhas Excel não usadas viram novos `ConfrontoResult` com `status: 'ausente_xml'`, `valorXml: null`. Aplica as mesmas regras de "OK automático" já existentes (CPF emitente, CFOP de frete, CFOP de ajuste zerado) para não criar falsos ausentes.
- Retorna `{ results, summary, matched, unmatched }`.

**`src/components/ResultsSection.tsx`**:
- Novo `excelInputRef` (`<input type="file" accept=".xlsx,.xls">`) e estado `isAddingExcel`.
- Novo botão **Adicionar Excel** ao lado de "Adicionar XMLs", visível quando `canEditXmls`.
- Se o workbook tiver múltiplas abas: reusa o `SheetSelectorDialog` já existente em `UploadSection` — extraí-lo para `src/components/SheetSelectorDialog.tsx` (componente compartilhado) para evitar duplicação. Se só tiver uma aba, processa direto.
- Handler `processExcelFiles` chama `parseSheet` para cada aba selecionada, `salvarLinhasExcel`, depois `reconcileExcel`, depois `onUpdate` (se houver). Estende a dropzone do mês também para `.xlsx`/`.xls` (opcional — manter só botão é suficiente, vou manter só botão para não confundir a dropzone existente).

**Arquivos tocados**
- `src/lib/confronto-engine.ts` (adicionar `reconcileExcel`)
- `src/components/ResultsSection.tsx` (botão + handler + dialog de seleção de aba)
- `src/components/SheetSelectorDialog.tsx` (novo — extraído do `UploadSection`)
- `src/components/UploadSection.tsx` (refatorar para usar o dialog compartilhado)

Sem mudanças de banco, sem mudanças de tipos, sem mudanças de RLS — a tabela `excel_linhas_armazenadas` e `salvarLinhasExcel` já existem.
