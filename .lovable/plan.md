

## Melhorias na tela de Resultados

Duas melhorias na seção de resultados do confronto:

### 1. Botão "Adicionar XMLs Avulsos" (resolve "Ausentes no XML")

Quando existirem registros com status **"Ausente no XML"** (NF lançada na planilha mas o XML não estava no lote inicial — geralmente porque foi emitida fora do prazo), aparecerá um botão para enviar XMLs avulsos sem precisar refazer toda a análise.

**Comportamento:**
- Botão **"Adicionar XMLs"** no topo da seção de resultados (ao lado de "Exportar Excel" / "Nova Análise"), visível quando houver pelo menos 1 ausente.
- Abre seletor de arquivos `.xml` (múltiplos).
- Os XMLs novos são parseados e re-confrontados **apenas contra os registros atualmente "ausente_xml"**, mantendo todos os demais resultados intactos.
- Cada match transforma o registro de `ausente_xml` em `ok` (ou `divergente` se houver diferença de valor) e os contadores do resumo são recalculados.
- XMLs novos que não baterem com nenhum ausente entram como `nao_escriturado`.
- Toast informando: "X notas reconciliadas, Y XMLs sem correspondência".

### 2. Botão de excluir linha (resolve divergências por nota cancelada)

Cada linha da tabela ganha um pequeno botão **lixeira** (ícone) na última coluna, para o usuário descartar manualmente registros que sabe serem inválidos (nota cancelada, lançamento duplicado, etc.).

**Comportamento:**
- Ícone discreto (Trash2 do lucide-react), aparece em todas as linhas.
- Ao clicar abre um `AlertDialog` de confirmação ("Excluir este registro do confronto?") para evitar exclusão acidental.
- Confirmado: remove o registro do array `results` e recalcula `summary` (totais + contadores por status).
- A exclusão é apenas **na sessão atual** (não persiste no banco). A exportação para Excel reflete o estado já filtrado.

---

### Detalhes técnicos

**Arquivos alterados:**
- `src/components/ResultsSection.tsx` — passa a gerenciar `results` e `summary` como estado interno (atualmente é só prop), expõe `onResultsChange` opcional ou trata via `useState` local inicializado pelas props. Adiciona:
  - Header: novo `<input type="file" accept=".xml" multiple>` oculto + botão **"Adicionar XMLs"** (Plus icon) condicional a `summary.ausentes > 0`.
  - Nova coluna **"Ações"** na tabela com botão lixeira por linha + `AlertDialog` para confirmação.
  - Função `recomputeSummary(results)` que recalcula os 6 contadores.
- `src/lib/confronto-engine.ts` — exportar nova função `reconcileMissing(currentResults, newXmlData)` que:
  1. Filtra `currentResults` com `status === 'ausente_xml'`.
  2. Para cada XML novo, tenta casar por `chNFe` ou `nNF + cnpjEmitente` com os ausentes.
  3. Atualiza o registro existente in-place (status, valorXml, diferenca, chNFe) — `ok` se diff ≤ 0,01, senão `divergente`.
  4. XMLs novos sem match viram registros `nao_escriturado` e são anexados.
  5. Retorna `{ results, summary }` recalculado.
- `src/routes/index.tsx` — não precisa mudar (Results já gerencia próprio estado), ou alternativamente passar callback `onResultsUpdate` para sincronizar o estado pai. Vou usar estado interno em ResultsSection para manter o componente autocontido.

**UX detalhes:**
- Coluna "Ações" alinhada à direita, largura mínima.
- Tooltip "Excluir registro" no botão lixeira.
- Botão "Adicionar XMLs" com loading enquanto parseia.
- Toasts via `sonner` (já instalado) para feedback.

