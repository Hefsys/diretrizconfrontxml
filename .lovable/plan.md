

## Filtro de Notas Canceladas (XML)

Atualmente notas canceladas aparecem como "Divergente" ou "Não escriturado" e poluem a análise. Vou detectar o status de cancelamento direto do XML e expor um novo status/filtro próprio.

### Como o cancelamento é identificado no XML

Dois locais possíveis (um basta):
1. **`protNFe > infProt > cStat`** com valor **`101`** = "Cancelamento de NF-e homologado" (autorização original já veio cancelada).
2. **`procEventoNFe`** com `tpEvento = 110111` (Cancelamento) e `cStat` = **`135`** ou **`155`** dentro do mesmo arquivo (XML que veio com o evento de cancelamento embutido).

Quando qualquer uma dessas condições for verdadeira, o XML é marcado como cancelado.

### Comportamento

- **Novo status `cancelada`** com badge cinza/escuro e emoji 🚫.
- Notas canceladas **nunca** entram como `divergente`, `ok`, `ausente_xml` ou `nao_escriturado` — sobrescrevem o status final do confronto, mesmo que tenham match com a planilha (afinal foram canceladas).
- **Novo card de resumo** "Canceladas" (laranja/cinza) e **novo chip de filtro** `🚫 Cancelada (N)`.
- Funciona junto com o filtro mensal já existente (entram nos contadores recalculados por competência).
- A reconciliação por drag-and-drop (`reconcileMissing`) também respeita: XML cancelado que bate com um `ausente_xml` da planilha vira `cancelada` (sinaliza ao usuário que aquela nota lançada já foi cancelada na origem).
- Exportação Excel inclui a nova coluna/status normalmente (já é genérico).

---

### Detalhes técnicos

**`src/lib/types.ts`**
- Adicionar `'cancelada'` ao union `ConfrontoStatus`.
- Adicionar `cancelada: boolean` em `XmlNfeData`.
- Adicionar `canceladas: number` em `ConfrontoSummary`.

**`src/lib/xml-parser.ts`**
- Nova função `isXmlCancelada(doc: Document): boolean`:
  - Lê `cStat` dentro de `infProt` → cancelada se `=== '101'`.
  - Procura qualquer `infEvento` com `tpEvento === '110111'` e `cStat` em `['135','155']` → cancelada.
- `parseXmlNfe` retorna `cancelada` no objeto.

**`src/lib/confronto-engine.ts`**
- `recomputeSummary`: incluir `canceladas: results.filter(r => r.status === 'cancelada').length`.
- Em `runConfronto`: ao montar cada resultado, se `matchedXml?.cancelada === true` → `status = 'cancelada'` (sobrepõe `ok`/`divergente`). Para XMLs sem match (caem em `nao_escriturado`), também marcar como `cancelada` se o XML estiver cancelado.
- Em `reconcileMissing`: ao casar um ausente com um XML cancelado, `status = 'cancelada'` em vez de `ok`/`divergente`. Idem para os "não pareados" virando `cancelada` quando o XML estiver cancelado.

**`src/components/ResultsSection.tsx`**
- `STATUS_CONFIG`: adicionar entrada `cancelada` (cor cinza/zinc, emoji 🚫, label "Cancelada").
- Adicionar 7º `SummaryCard` "Canceladas" (mantendo o grid `lg:grid-cols-7`).
- Adicionar chip de filtro `🚫 Cancelada` na lista `filters`.
- `summaryForMonth`: incluir contagem de `canceladas`.
- Atualizar `colSpan={11}` para `colSpan={11}` (sem mudança — as colunas continuam iguais; só o conjunto de status cresce).

**`src/lib/export-excel.ts`** — sem alteração funcional necessária (o status já é serializado a partir do enum); apenas confirmar que o novo valor renderiza corretamente.

