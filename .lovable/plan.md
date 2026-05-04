## Pedido
1. **Excluir fechamentos** salvos.
2. **Adicionar XMLs** a uma análise já salva (para reconciliar notas ausentes sem precisar refazer tudo).

## Estado atual
- `fechamentos_mensais` só tem policy de DELETE para admins; nenhum usuário do projeto é admin.
- Não há policy de UPDATE — análises salvas são imutáveis.
- A página de detalhe (`/fechamentos/<id>`) renderiza `ResultsSection` em `readOnly`, que esconde o botão "Adicionar XMLs" e a dropzone.

## Plano

### 1. Banco — relaxar RLS (migration)
- `DROP` policy "Admins can delete fechamentos" e criar **"Authors or admins can delete fechamentos"** com `USING (auth.uid() = fechado_por OR has_role(auth.uid(), 'admin'))`.
- `CREATE` policy **"Authors or admins can update fechamentos"** com a mesma condição (necessária para persistir XMLs adicionados à análise salva).

### 2. Excluir fechamento — listagem (`src/routes/fechamentos.tsx`)
- Adicionar botão lixeira (`Trash2`) na coluna **Ações** ao lado do olho/download, visível apenas quando `f.fechado_por === user.id` (ou se admin no futuro).
- Confirmação via `AlertDialog`: "Excluir esta análise? Esta ação não pode ser desfeita."
- Ao confirmar: `supabase.from('fechamentos_mensais').delete().eq('id', f.id)` + atualiza estado local + toast.

### 3. Adicionar XMLs em análise salva
**`src/components/ResultsSection.tsx`:**
- Nova prop opcional `onUpdate?: (results, summary) => Promise<void>`.
- Em `readOnly`, se `onUpdate` estiver presente:
  - Mostrar botão "Adicionar XMLs" e a dropzone (mesma condição: existirem ausentes no mês selecionado).
  - Após o `processXmlFiles` reconciliar, chamar `await onUpdate(newResults, newSummary)` para persistir.
- O badge "Análise salva" continua aparecendo para deixar claro o contexto, mas a análise pode ser **atualizada**.

**`src/lib/fechamentos.ts`:**
- Nova função `atualizarFechamento(id, resumo, resultados)` que faz `UPDATE` em `fechamentos_mensais`.

**`src/routes/fechamentos_.$fechamentoId.tsx`:**
- Passar `onUpdate` para `ResultsSection`. Implementação chama `atualizarFechamento(fechamentoId, summary, results)` e atualiza o estado local do `fechamento` com os novos dados (para o cabeçalho refletir).
- Verificar `fechamento.fechado_por === user.id` para decidir se passa `onUpdate` (caso contrário não permite editar).

### 4. Edge cases
- Após excluir o fechamento aberto na detalhe, o usuário cai num 404 — mas como a exclusão acontece na listagem, não há esse problema.
- Se o usuário não for o autor, botão lixeira e botão "Adicionar XMLs" não aparecem (somente leitura puro).

## Arquivos alterados
- Migration SQL (RLS de DELETE/UPDATE em `fechamentos_mensais`)
- `src/lib/fechamentos.ts` — nova função `atualizarFechamento`
- `src/components/ResultsSection.tsx` — nova prop `onUpdate`, libera dropzone/botão XML em readOnly quando há `onUpdate`
- `src/routes/fechamentos.tsx` — botão lixeira + diálogo de confirmação
- `src/routes/fechamentos_.$fechamentoId.tsx` — passa `onUpdate` quando o usuário é autor

Confirma?
