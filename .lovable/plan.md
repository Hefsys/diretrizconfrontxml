
## Problema

Ao usar **"Adicionar XMLs"** (ou arrastar XMLs no dropzone do mês) na tela de resultados, as notas marcadas como **"Ausente no XML"** muitas vezes continuam ausentes mesmo quando o XML correspondente foi enviado. Investigação do código revelou três causas:

### Causa 1 — Critério de match restritivo (principal)
Em `src/lib/confronto-engine.ts`, `reconcileMissing` só consegue casar XML ↔ linha ausente em dois cenários:
- `chNFe` da linha tem exatamente 44 dígitos **e** bate com a do XML, **ou**
- `nNF` **E** `cnpjEmitente` da linha existem **e** batem com o XML.

Na planilha **RFS008 do Dealernet** isso falha com frequência:
- a coluna "Chave NF-e" muitas vezes vem em branco ou truncada;
- quando a coluna CNPJ não foi corretamente identificada pelo parser, `row.cnpjEmitente` fica vazio → **o fallback nNF+CNPJ nunca dispara** e a nota permanece "ausente".

### Causa 2 — XMLs adicionados não são persistidos
`processXmlFiles` em `ResultsSection.tsx` chama `parseXmlFiles` + `reconcileMissing`, mas **não chama `salvarXmls`**. Os XMLs reconciliados ficam só em memória — refazer a análise no dia seguinte volta a mostrar tudo como ausente.

### Causa 3 — Filtro de mês descarta linhas com data inválida
Quando a data da nota não foi parseada da planilha (cai em `'sem-data'`), o `monthFilter` exclui essa linha de qualquer competência selecionada → ela nunca é reconciliada via dropzone do mês.

---

## Solução

### 1. Tornar o match mais tolerante em `reconcileMissing`
Em `src/lib/confronto-engine.ts`, ampliar a lógica de busca por XML correspondente, na seguinte ordem de prioridade:

1. `chNFe` (44 dígitos) — exato.
2. `nNF` + `cnpjEmitente` limpos — exato.
3. **Novo**: `nNF` apenas, restrito ao escopo já filtrado (mesma competência via `monthFilter`, ou todo o conjunto se não houver filtro). Quando há ambiguidade (mais de um XML com o mesmo `nNF` no escopo), pular para evitar match errado.
4. **Novo**: se a linha tem `cnpjEmitente` mas `nNF` vazio/zero, tentar match por CNPJ + `vNF` aproximado (≤ 0,01) dentro do escopo.

Isso resolve os casos do RFS008 onde a chave/CNPJ não vem na planilha.

### 2. Persistir XMLs adicionados na base da empresa
Em `src/components/ResultsSection.tsx`, função `processXmlFiles`:
- Importar `salvarXmls` de `@/lib/xml-storage`.
- Após o parse e antes de `reconcileMissing`, chamar `salvarXmls(empresaId, user.id, xmlData)`.
- Incluir a contagem de salvos no toast: `"X reconciliada(s) · Y XML(s) salvo(s) na base"`.
- Requer que `ResultsSection` receba (já recebe) `empresaId` e tenha acesso ao `user` (já tem via `useAuth`). Se `empresaId` não estiver presente, pular a persistência com aviso suave.

### 3. Não excluir notas "sem-data" do dropzone do mês
Em `processXmlFiles` (ResultsSection.tsx), ajustar `monthFilter`:
- Quando `selectedMonth !== 'todos'`, aceitar tanto linhas do mês selecionado **quanto** linhas com `getMonthKey(row.data) === 'sem-data'`. Assim, notas sem data parseável também participam da reconciliação manual quando o usuário está focado em um mês específico.

### 4. Pequeno ajuste de UX
- Manter o botão "Adicionar XMLs" no header também quando `selectedMonth !== 'todos'` e houver ausentes naquele mês (hoje só aparece em "todos"), além do dropzone — assim o usuário tem ambos os caminhos visíveis.

---

## Arquivos afetados

- `src/lib/confronto-engine.ts` — ampliar fallbacks de match em `reconcileMissing` (itens 3 e 4 da lógica).
- `src/components/ResultsSection.tsx` — chamar `salvarXmls` em `processXmlFiles`, ajustar `monthFilter` para incluir `sem-data`, exibir botão também em mês específico.

Sem mudanças de schema no banco. Sem novas dependências.

---

## Como validar depois

1. Selecionar empresa, processar planilha RFS008 com algumas chaves vazias.
2. Confirmar notas em "Ausente no XML".
3. Clicar em uma competência específica → arrastar XMLs daquelas notas no dropzone.
4. Esperado: notas viram "OK"/"Divergente" e o toast mostra também "X salvo(s) na base".
5. Clicar em "Nova Análise", reenviar a mesma planilha sem reenviar XMLs → as mesmas notas devem aparecer já reconciliadas (vindas da base histórica).
