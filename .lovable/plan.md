## Objetivo

Permitir abrir um fechamento salvo dentro da página **Fechamentos** e ver a mesma análise detalhada da tela de **Confronto** — em modo **somente leitura**, sem precisar reimportar planilha ou XMLs.

## O que muda

### 1. Tornar o `ResultsSection` reutilizável em modo "somente leitura"

`src/components/ResultsSection.tsx` hoje é usado só após uma análise nova. Vou adicionar uma prop opcional `readOnly?: boolean` (default `false`). Quando `true`:

- **Esconder** os botões/ações de mutação:
  - "Adicionar XMLs" + dropzone de arrastar XMLs
  - "Fechar mês"
  - "Nova Análise"
  - Botão de excluir (lixeira) em cada linha
- **Manter** tudo o que é leitura: filtros por status, chips de competência, busca por nº NF, cards de resumo, tabela completa, e botão "Exportar Excel".
- Em vez de "Nova Análise", mostrar um botão "Voltar" que chama `onReset`.
- Mostrar um badge fixo "Mês fechado" ao lado do título.

Nenhuma lógica de cálculo muda — apenas oculta controles.

### 2. Nova rota de detalhe: `/fechamentos/$fechamentoId`

Arquivo novo: `src/routes/fechamentos.$fechamentoId.tsx`

- Carrega o fechamento via `supabase.from('fechamentos_mensais').select('*').eq('id', ...).single()`.
- Carrega o nome da empresa para o cabeçalho.
- Renderiza o mesmo header da página atual de Fechamentos (logo + nav + sair).
- Renderiza `<ResultsSection results={f.resultados} summary={f.resumo} readOnly empresaId={f.empresa_id} onReset={() => navigate({ to: '/fechamentos' })} />`.
- Trata `errorComponent` e `notFoundComponent`.

### 3. Lista de Fechamentos vira clicável

Em `src/routes/fechamentos.tsx`, cada linha da tabela passa a ter um botão "Abrir" (ícone de olho/abrir) ao lado do botão de download, navegando para `/fechamentos/$fechamentoId`. A linha inteira também recebe `cursor-pointer` + onClick para abrir o detalhe (o clique no botão de download faz `stopPropagation` para não abrir o detalhe).

## Observações

- Os dados do fechamento já são salvos por completo no `fechamentos_mensais.resultados` (jsonb), então não precisa reler XMLs nem planilha — basta hidratar a tela com esse jsonb. O snapshot reflete exatamente o estado no momento em que o mês foi fechado.
- Como é só leitura, mesmo se XMLs forem adicionados/removidos depois na base, o fechamento mostra o que foi congelado — comportamento desejado para auditoria.
- Nenhuma alteração em banco / RLS / engine / parsers.

## Arquivos editados/criados

- `src/components/ResultsSection.tsx` — adicionar prop `readOnly` e ocultar controles de mutação quando ativa.
- `src/routes/fechamentos.tsx` — tornar linhas clicáveis e adicionar botão "Abrir".
- `src/routes/fechamentos.$fechamentoId.tsx` — **novo** arquivo, página de detalhe.
