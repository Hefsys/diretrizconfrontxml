# Fechamentos abrindo devagar / com erro

## O que está acontecendo (verificado no banco e no código)

- Cada análise salva guarda o snapshot completo das linhas. As maiores têm **12.389 e 3.229 linhas** (até ~460 KB de JSON por registro).
- A **lista** de Fechamentos (`src/routes/fechamentos.tsx`) busca `select('*')`, ou seja baixa o snapshot inteiro de **todas** as análises só para mostrar título, competência e contadores. Com dezenas de registros isso são vários MB por abertura da página.
- O **detalhe** (`src/routes/fechamentos_.$fechamentoId.tsx` + `ResultsSection`) renderiza **todas** as linhas filtradas de uma vez (`filtered.map(...)` na tabela). Com milhares de linhas o navegador congela e pode estourar (a "demora"/"erro" ao abrir).

## Correções propostas

### 1. Lista de fechamentos leve
Buscar somente as colunas necessárias (`id`, `empresa_id`, `competencia`, `titulo`, `fechado_em`, `resumo`) em vez de `*`.
O botão "Baixar Excel" da lista passa a buscar `resultados` daquele registro no momento do clique (com estado de carregando no botão).

### 2. Tabela paginada no detalhe
Na tabela de resultados, mostrar em páginas de 100 linhas, com controles "Anterior/Próxima", contador ("1–100 de 3.229") e seletor de tamanho de página. Filtros, busca e exportação continuam operando sobre o conjunto completo — só a renderização é paginada.

### 3. Detalhe abre mais rápido
- Buscar empresa e fechamento em paralelo, sem esperar um pelo outro.
- Rodar a normalização de linhas antigas (`sanitizeLegacyResults`) apenas uma vez por carga, memorizada, para não repetir a cada render.
- Mensagem de erro clara com botão "Tentar novamente" caso a busca falhe, em vez de cair direto em "não encontrado".

## Detalhes técnicos

- `src/lib/fechamentos.ts`: `listarFechamentos` passa a selecionar campos explícitos e retornar `resultados: []`; nova função `carregarResultados(id)` para o download sob demanda.
- `src/routes/fechamentos.tsx`: usar a nova função no botão de exportar; tipo da lista vira um `FechamentoResumo` (sem `resultados`).
- `src/components/ResultsSection.tsx`: paginação local (`page`, `pageSize`) derivada de `filtered`; ajustar os índices de exclusão/edição de linha para o offset da página.
- `src/routes/fechamentos_.$fechamentoId.tsx`: carregamento paralelo, memo do sanitize, estado de erro com retry.

Sem mudanças no banco e sem mudança na lógica de confronto.
