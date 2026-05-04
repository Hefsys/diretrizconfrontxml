## Objetivo

Adicionar um botão **"Salvar análise"** na tela de resultado do Confronto que persiste o fechamento e leva o usuário direto para a página de Fechamentos.

Hoje já existe o botão **"Fechar mês"**, mas ele:
- Só aparece quando uma competência específica está selecionada (não funciona com "Todos")
- O nome "Fechar mês" não comunica claramente que é a ação de salvar
- Não navega para `/fechamentos` depois de salvar — fica na mesma tela

## Mudanças

### 1. `src/components/ResultsSection.tsx`
- Renomear o botão "Fechar mês" para **"Salvar análise"** (mantém o ícone de cadeado discreto + Save).
- Quando o usuário estiver em **"Todos"** e houver mais de uma competência nos resultados, abrir um pequeno seletor (dialog) pedindo qual competência salvar — ou salvar todas em lote, uma por uma.
- Quando há apenas uma competência detectada nos dados (mesmo com "Todos" selecionado), salvar direto essa competência sem perguntar.
- Após salvar com sucesso:
  - Toast de sucesso (mantém)
  - Navegar para `/fechamentos` usando `useNavigate` do `@tanstack/react-router`
- Manter o comportamento de gerar o Excel ao salvar (já existe).
- Manter o `AlertDialog` de confirmação antes de salvar.

### 2. Texto/UX
- Botão principal de salvar fica na cor da marca (`bg-diretriz-red`) para ganhar destaque, e o "Nova Análise" vira `outline` para não competir.
- Tooltip explicando: "Salva esta análise em Fechamentos e gera o Excel".

## Detalhes técnicos

- Arquivo único alterado: `src/components/ResultsSection.tsx`.
- Usar `useNavigate()` de `@tanstack/react-router` para redirecionar após `fecharMes` retornar `ok: true`.
- Para o caso "Todos" com múltiplas competências: iterar `monthsAvailable`, chamar `fecharMes` para cada uma (ignorando as já fechadas), agregar resultado e mostrar toast com resumo (ex: "3 competências salvas, 1 já estava fechada").
- Nenhuma mudança de schema, nenhuma migration.