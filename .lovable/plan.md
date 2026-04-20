

## Visão mês a mês + Drag-and-drop por mês

Duas melhorias na tela de Resultados:

### 1. Agrupamento mensal (visão mês a mês)

Os resultados ganham um **seletor de mês** para filtrar/visualizar o confronto separadamente por competência.

**Comportamento:**
- O mês de cada registro é derivado do campo `data` (DD/MM/AAAA) — para XMLs vem de `dhEmi`, para planilha vem de `dataDocumento`/`dataEntrada`.
- Acima dos cards de resumo aparece uma **linha de abas/chips de mês**: `Todos | Jan/2025 | Fev/2025 | Mar/2025...` (apenas meses presentes nos dados, ordenados cronologicamente).
- Cada chip mostra a contagem de registros daquele mês: `Jan/2025 (42)`.
- Ao selecionar um mês, **tudo é filtrado por aquela competência**: cards de resumo recalculam (OK, divergentes, ausentes etc. **só daquele mês**), filtros de status, tabela e exportação Excel.
- "Todos" mantém o comportamento atual (visão consolidada).

### 2. Drag-and-drop de XMLs por mês

O botão "Adicionar XMLs" evolui para uma **zona de arrastar-e-soltar contextual ao mês selecionado**.

**Comportamento:**
- Quando um mês específico estiver selecionado e houver pelo menos 1 ausente nesse mês, aparece uma **dropzone tracejada** logo abaixo do header: *"Arraste XMLs de Mar/2025 aqui ou clique para selecionar"*.
- Aceita arrastar arquivos `.xml` individuais ou uma pasta inteira (via input `webkitdirectory` no botão de fallback).
- O `reconcileMissing` é chamado **filtrando os ausentes apenas do mês selecionado** — XMLs que correspondem viram `ok`/`divergente`; XMLs que não baterem com nenhum ausente do mês entram como `nao_escriturado` (com sua data própria).
- Toast: *"Mar/2025: 5 reconciliada(s), 1 sem correspondência"*.
- Visual ativo no drag-over (borda vermelha Diretriz + fundo levemente colorido).
- Quando "Todos" estiver selecionado, mantém o comportamento atual (botão simples "Adicionar XMLs" no header, reconciliando contra todos os ausentes).

---

### Detalhes técnicos

**Arquivos alterados:**

- `src/components/ResultsSection.tsx`
  - Novo helper `getMonthKey(data: string)` — extrai `"YYYY-MM"` de strings `"DD/MM/AAAA"` (e `"AAAA-MM-DDTHH:mm:ss"` para `dhEmi` de XML); registros sem data válida vão para chave `"sem-data"`.
  - Novo helper `formatMonthLabel(key)` → `"Mar/2025"` (pt-BR, abreviado).
  - Novo state `selectedMonth: string | 'todos'` (default `'todos'`).
  - `useMemo` `monthsAvailable` — lista única ordenada de meses presentes em `results` com contagem.
  - `useMemo` `resultsForMonth` — filtra `results` pelo mês selecionado (ou retorna todos).
  - `useMemo` `summaryForMonth` — chama `recomputeSummary(resultsForMonth)` quando mês ≠ 'todos'; senão usa `summary` global.
  - O `filtered` (filtro por status) passa a operar sobre `resultsForMonth`.
  - Cards de resumo, filtros de status, tabela e botão "Exportar Excel" passam a usar `resultsForMonth`/`summaryForMonth`.
  - **Linha de chips de mês** renderizada acima dos summary cards.
  - **Dropzone**: novo componente inline com `onDragOver`/`onDragLeave`/`onDrop`, visível quando `selectedMonth !== 'todos' && summaryForMonth.ausentes > 0`. Reaproveita o input file existente e a função `handleXmlFiles`.
  - Em `handleXmlFiles`, quando há mês selecionado, chama uma variante `reconcileMissingForMonth(results, xmlData, monthKey)` (ou passa o filtro como segundo argumento).

- `src/lib/confronto-engine.ts`
  - Refatorar `reconcileMissing` para aceitar parâmetro opcional `monthFilter?: (row: ConfrontoResult) => boolean`. Quando informado, só tenta reconciliar ausentes que satisfaçam o filtro; XMLs não-pareados ainda viram `nao_escriturado` (com sua data nativa).
  - Exportar helper `getMonthKey` reusável.

- `src/lib/export-excel.ts` — só recebe a lista filtrada que o componente já passa; nenhuma mudança interna necessária.

**UX:**
- Chips de mês usam o mesmo estilo dos chips de status (selecionado = `bg-diretriz-dark`).
- Dropzone com `border-2 border-dashed border-diretriz-red/30`, hover/drag = `border-diretriz-red bg-diretriz-red/5`.
- Ícone `CalendarDays` (lucide) ao lado do label do mês selecionado, `Upload` na dropzone.
- Loading spinner no drop enquanto parseia.

