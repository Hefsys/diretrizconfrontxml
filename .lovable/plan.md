## Problemas identificados

**1. "Não consigo abrir a análise"**
A rota `/fechamentos/$fechamentoId` está aninhada como filha de `/fechamentos` (porque o arquivo se chama `fechamentos.$fechamentoId.tsx`). A página `fechamentos.tsx` é o layout pai mas NÃO renderiza `<Outlet />` — então ao clicar em uma linha, a URL muda mas continua aparecendo a lista, nunca o detalhe.

**2. "Quero fechar por análise, não por mês"**
Hoje o banco tem `UNIQUE (empresa_id, competencia)`, então só existe UM fechamento por competência por empresa. O usuário quer poder salvar **várias análises** para a mesma competência (ex.: revisões, recortes diferentes) e dar um **rótulo/título** para cada uma.

---

## Plano

### A. Corrigir abertura do detalhe
Renomear `src/routes/fechamentos.$fechamentoId.tsx` → `src/routes/fechamentos_.$fechamentoId.tsx` (prefixo `_` "escapa" o aninhamento no TanStack Router, tornando a rota irmã de `/fechamentos` em vez de filha). A URL pública continua `/fechamentos/<id>`, mas deixa de exigir `<Outlet />` no layout pai.

Alternativa considerada (rejeitada): adicionar `<Outlet />` em `fechamentos.tsx` — quebraria o layout atual da listagem que ocupa a tela inteira.

### B. Múltiplas análises por competência com rótulo

**Banco** (migration):
- Adicionar coluna `titulo text` em `fechamentos_mensais` (rótulo livre dado pelo usuário, ex.: "Fechamento oficial Mar/26", "Revisão pós-correção").
- **Remover** a constraint `UNIQUE (empresa_id, competencia)` para permitir várias análises na mesma competência.
- Manter `competencia` (continua útil para agrupar/filtrar por mês).

**Fluxo "Salvar análise"** (`ResultsSection.tsx`):
- Abrir um diálogo que pede:
  - **Título da análise** (obrigatório, default sugerido: `Análise <Mês/Ano> — <data atual>`)
  - **Competência** (select preenchido com os meses detectados nos resultados; default = mês selecionado ou o mais frequente)
- Salvar SEMPRE 1 registro só (a análise atual com TODOS os resultados visíveis), não mais um registro por mês detectado.
- Remover a lógica de "competências já fechadas / cadeados" — como agora podem coexistir várias análises, o conceito de "mês fechado bloqueado" deixa de fazer sentido. Os chips de mês continuam, mas sem ícone de cadeado.
- Após salvar, redirecionar para `/fechamentos` (já funciona).

**Listagem** (`fechamentos.tsx`):
- Adicionar coluna **"Título"** antes (ou no lugar) de "Competência".
- "Competência" continua aparecendo como badge.
- Permitir excluir uma análise específica (botão lixeira já protegido por RLS de admin) — *opcional, posso deixar para depois se preferir*.

**Detalhe** (`fechamentos_.$fechamentoId.tsx`):
- Mostrar o `titulo` no cabeçalho, junto com competência e data.

**Tipos** (`src/lib/types.ts`):
- `FechamentoMensal` ganha `titulo: string | null`.

**Helpers** (`src/lib/fechamentos.ts`):
- `fecharMes` passa a receber `titulo` e não trata mais erro de duplicidade (não existe mais).
- Renomear conceitualmente para "salvar análise", mas mantenho o nome da função para evitar refactor amplo.

---

## Detalhes técnicos

### Arquivos alterados
- `src/routes/fechamentos.$fechamentoId.tsx` → renomeado para `fechamentos_.$fechamentoId.tsx` (mesmo conteúdo, apenas mostrar título no header)
- `src/routes/fechamentos.tsx` — adicionar coluna Título
- `src/components/ResultsSection.tsx` — diálogo de salvar com inputs Título + Competência; remover loop por competência
- `src/lib/fechamentos.ts` — assinatura `fecharMes` aceita `titulo`
- `src/lib/types.ts` — campo `titulo`
- Migration SQL: `ALTER TABLE fechamentos_mensais ADD COLUMN titulo text; ALTER TABLE fechamentos_mensais DROP CONSTRAINT fechamentos_mensais_empresa_id_competencia_key;`

### Comportamento resultante
- Cada clique em "Salvar análise" cria 1 linha nova em Fechamentos com título + competência escolhidos pelo usuário.
- Várias análises podem existir para Mar/26 da mesma empresa.
- Clicar em qualquer linha (ou no olho) abre a tela completa de Confronto em modo somente-leitura — agora funcionando.

Confirma este plano para eu implementar?
