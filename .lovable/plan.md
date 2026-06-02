## Contexto

A planilha enviada (`RFS008_RegistroEntradaICMS`) deixou a regra da Yamaha clara. Para o emitente **YAMAHA MOTOR DA AMAZONIA LTDA — CNPJ 04.817.052/0001-06**, cada NF ocupa **duas (ou mais) linhas** no relatório:

- **Linha principal** (com Nº NF preenchido): tem `AA` (Valor Contábil) e geralmente `AR` (ICMS ST RET ENTRADA).
- **Linha(s) de continuação** (sem Nº NF, só com observação em `AP`): trazem outros valores em `AR`, como **VALOR PIS/COFINS RET**.

Exemplo da própria planilha — NF 3335869:
- Linha 28: AA = 25.716,03 · AR = 657,81 (ICMS ST RET ENTRADA)
- Linha 29: AR = 804,87 (VALOR PIS/COFINS RET)
- vNF do XML = 25.716,03 + 657,81 + 804,87 = **27.178,71**

Hoje o parser **descarta** a linha de continuação (sem nNF) e por isso só compara AA contra o XML, gerando a divergência de R$ 394,15 (e similares) que aparece na tela.

A segunda dor é só de UX: nas telas de XMLs e de Excel (aba "Planilhas (Excel)") só existe lixeira por linha — falta seleção múltipla e um filtro rápido para zerados.

---

## Plano

### 1. Regra Yamaha — somar AR das linhas de continuação

**`src/lib/excel-parser.ts`**
- Adicionar `CNPJS_SOMA_AR = new Set<string>(['04817052000106'])` (Yamaha). Estrutura para receber outros CNPJs no futuro.
- No loop de `parseSheet`, quando a linha atual **não tem** `nNF` mas **tem** valor em `AR` (coluna absoluta 43, índice 0-based) **e existe uma linha anterior já emitida cujo `cnpjEmitente` está em `CNPJS_SOMA_AR`**, somar esse `AR` ao `valorContabil` da última linha emitida. Sem criar novo registro para a linha de continuação.
- Para a própria linha principal da Yamaha (com nNF), somar também o `AR` da própria linha ao `valorContabil` na hora de criar o registro.
- Coluna `AR` é fixa (índice 43) — não está no `colMap`. Como o relatório RFS008 tem layout estável, ler direto por índice posicional. Adicionar comentário explicando.

**`src/lib/confronto-engine.ts`** — nenhuma mudança; segue comparando `valorContabil` vs `vNF` normalmente.

### 2. Seleção múltipla + exclusão em massa

Aplicar o mesmo padrão nas duas telas:

**`src/routes/xmls.tsx`** (aba "XMLs")
- Coluna de checkbox à esquerda + checkbox "selecionar todos" no header (respeita filtro atual).
- Barra de ação que aparece quando há seleção: `N selecionados` + botão **"Excluir selecionados"** (vermelho, com confirm).
- `delete().in('id', ids)` em lote, atualiza o estado local.

**`src/components/ExcelBaseSection.tsx`** (aba "Planilhas (Excel)")
- Mesma estrutura: checkboxes, header "selecionar todos", botão "Excluir selecionados".
- Adicionar um **filtro rápido "Somente zerados"** (switch ou item no select de status já existente) que mostra apenas linhas com `valor_contabil = 0` (ou `null`/`0`).
- Botão extra **"Selecionar todos os zerados"** que marca de uma vez todas as linhas zeradas visíveis — facilita o caso de uso mais comum.

### 3. Detalhes técnicos

- Usar componente `Checkbox` do shadcn já presente em `src/components/ui/checkbox.tsx`.
- Estado: `const [selected, setSelected] = useState<Set<string>>(new Set())`. Limpar ao trocar empresa / filtros que mudam a lista, ou após excluir.
- Exclusão em massa: dialog `AlertDialog` confirmando "Excluir N linhas? Esta ação não pode ser desfeita." em vez de `confirm()` nativo.
- Critério "zerado" usado no filtro/seleção: `valor_contabil == null || Number(valor_contabil) === 0`.

### 4. Fora de escopo

- Nada muda nos fechamentos já salvos (eles continuam com o snapshot antigo). Confrontos novos passam a usar a regra correta da Yamaha.
- Nenhuma migração de banco.
- Nenhuma alteração na tela de Resultados do Confronto.
