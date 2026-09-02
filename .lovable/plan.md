# Tela "Algo deu errado" após o confronto

## O que a imagem mostra (verificado no código)

A tela de erro é o *error boundary* do próprio app (`src/router.tsx`), cujo texto original está em **inglês**: "Something went wrong / An unexpected error occurred. Please try again. / Try again / Go home". O que apareceu em português ("Algo deu errado… / Tente de novo / Vá para casa") é o **tradutor automático do Edge** traduzindo essa tela.

Ou seja: a tradução explica o texto, mas **houve um erro real de renderização** — o confronto terminou (o aviso verde mostra 2322 XMLs salvos, 22061 XMLs históricos, 1007 linhas Excel) e a quebra ocorreu ao montar a tela de resultados.

Duas causas prováveis, ambas coerentes com o cenário:

1. **O tradutor do navegador quebra o React.** Ele reescreve os textos do DOM; quando o React tenta atualizar/remover um nó que o tradutor substituiu, dá erro (`NotFoundError: failed to remove child`). Em telas com muita atualização dinâmica (tabela de resultados, filtros, contadores) isso é um problema clássico. O `<html lang="en">` faz o Edge oferecer tradução mesmo estando o conteúdo em português — o que aumenta a chance.
2. **Erro de dados na renderização dos resultados** (por exemplo campo nulo inesperado em alguma linha). Hoje é impossível saber qual, porque a mensagem real do erro só aparece em modo de desenvolvimento — em produção o app mostra o texto genérico.

A causa exata ainda **não está confirmada**; por isso o primeiro passo do plano é fazer o erro se identificar.

## Correções propostas

### 1. Mostrar o erro real (não mascarar)
Na tela de erro, exibir sempre a mensagem real (nome do erro + mensagem, com o detalhe técnico recolhível) e registrar no console. Assim, se acontecer de novo, o pessoal da Diretriz manda um print e já se sabe a causa.

### 2. Impedir que o tradutor quebre a aplicação
- Definir `lang="pt-BR"` na página (o conteúdo é português; o navegador para de propor tradução automática).
- Marcar as áreas dinâmicas do resultado com `translate="no"` / `notranslate`, evitando que o tradutor troque nós que o React controla.

### 3. Não perder o confronto quando algo quebrar
Envolver a tela de resultados em um limite de erro próprio: se a renderização falhar, aparece um aviso dentro da página (com a mensagem real e opção de tentar novamente) em vez da tela cheia "Algo deu errado" — sem perder o processamento já feito.

### 4. Reforçar a robustez da tabela
Revisar a renderização das linhas para tolerar campos vazios/nulos (datas, CNPJ, valores) sem lançar exceção.

## Detalhes técnicos

- `src/router.tsx`: `DefaultErrorComponent` passa a exibir `error.name`/`error.message` (e stack em `<details>`) também em produção, e faz `console.error` do erro.
- `src/routes/__root.tsx`: `<html lang="pt-BR">`; `<body>` sem alterações visuais.
- `src/components/ResultsSection.tsx`: `translate="no"` no container da tabela/cabeçalho de contadores; guardas em `formatCnpj`/`formatCurrency`/`getMonthKey` para valores `null`/`undefined`.
- `src/routes/index.tsx`: novo componente local `ResultsErrorBoundary` (class component com `componentDidCatch`) em volta de `<ResultsComp />`, exibindo mensagem real + botão "Tentar novamente".

Sem mudança de layout, identidade visual, campos ou na lógica do confronto.
