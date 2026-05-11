## Problema

Na última análise fechada, linhas que deveriam estar como **OK** estão aparecendo como **Ausente no XML**:

1. **CT-e (Frete) — CFOPs 1353/2353 (e similares)**: a planilha tem essas linhas, mas não existe NF-e correspondente (é Conhecimento de Transporte, não Nota Fiscal). Devem ficar OK.
2. **Fornecedores Pessoa Física (CPF, 11 dígitos)**: também não geram NF-e em muitos casos. Devem ficar OK.

Hoje o motor (`runConfronto`) já ignora frete via `isFrete` (CFOPs definidos em `CFOPS_FRETE_IGNORADOS`), mas:
- A regra de **CPF** não existe — qualquer linha com emitente PF cai como ausente.
- Para **fechamentos antigos** já salvos no banco, os resultados foram persistidos com `status: 'ausente_xml'` antes da regra de frete entrar; precisamos de um saneamento.

Além disso, `ConfrontoResult` não guarda o `cfop` da linha, então não dá para reclassificar frete em fechamentos antigos só lendo o JSON salvo. Precisamos passar a persistir o CFOP daqui para frente e fazer um fallback heurístico para o passado.

## Solução

### 1. Engine: tratar CPF como OK (sem XML esperado)

Em `src/lib/confronto-engine.ts`, no ramo "sem match", quando `cleanCnpj(row.cnpjEmitente).length === 11`:
- Status `ok`
- `nomeEmitente` preservado, ou "Pessoa Física (CPF)" se vazio
- `valorXml = valorPlanilha`, `diferenca = 0` (para que apareça como reconciliado)

### 2. Persistir `cfop` e `isFrete` no resultado

- Adicionar campos opcionais `cfop?: string` e `isFrete?: boolean` em `ConfrontoResult` (`src/lib/types.ts`).
- `runConfronto` propaga `row.cfop`/`row.isFrete` para cada resultado (tanto no caminho com match quanto sem match).
- Adicionar `cfop` em `ExcelNfeData` e populá-lo no `excel-parser.ts` (já lemos a coluna CFOP, basta guardar).

### 3. Saneamento ao abrir fechamento (corrige o passado)

Em `src/routes/fechamentos_.$fechamentoId.tsx`, depois de carregar `fechamento.resultados`, aplicar um `sanitizeLegacyResults` que percorre os resultados e converte para `ok` quando o status atual é `ausente_xml` e:

- `cleanCnpj(cnpjEmitente).length === 11` (CPF), **ou**
- `cfop` presente e em `CFOPS_FRETE_IGNORADOS`, **ou**
- `isFrete === true`, **ou**
- (heurística para legado sem CFOP) `nomeEmitente` contém "transport", "logística", "frete", "rodov" — opcional, baixo risco de falso positivo. *Pode ficar de fora se preferir só reprocessar.*

Se houver mudança e `onUpdate` estiver disponível (admin/criador), oferecer um botão **"Aplicar correções (CPF/Frete)"** que chama `onUpdate` com o resumo recalculado via `recomputeSummary`. Sem o botão, apenas exibe os ajustes em tela (não persiste).

### 4. UI

- Em `ResultsSection`, mostrar `cfop` na linha (se existir) — pequeno badge ao lado do nome do emitente para facilitar conferência.
- Mensagem da `Pessoa Física (CPF)` aparece no campo nome quando vazio.

## Arquivos alterados

- `src/lib/types.ts` — adiciona `cfop?: string`, `isFrete?: boolean` em `ExcelNfeData`/`ConfrontoResult`.
- `src/lib/excel-parser.ts` — popular `cfop` na saída.
- `src/lib/confronto-engine.ts` — regra CPF (status ok), propagação de `cfop`/`isFrete`, exporta `sanitizeLegacyResults` e `CFOPS_FRETE_IGNORADOS` (ou reutiliza do parser).
- `src/routes/fechamentos_.$fechamentoId.tsx` — chama `sanitizeLegacyResults` ao carregar; botão opcional para persistir.
- `src/components/ResultsSection.tsx` — exibir CFOP quando presente.

Sem migração de banco — `resultados` é JSONB livre e os campos novos são opcionais.

## Como o usuário verá

- Abrir o fechamento antigo → ausentes que eram CPF e CT-e viram OK na hora.
- Botão **"Aplicar correções"** salva o ajuste no banco (visível para Leonardo e demais).
- Novas análises já saem corretas direto do `runConfronto`.
