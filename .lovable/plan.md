## Problema

Quando você anexa os XMLs na tela inicial e clica em "Processar Confronto", o resultado mostra todas as notas como "Ausente no XML". Só depois, ao usar o botão "Adicionar XMLs" na tela de resultados, é que as notas batem.

## Causa

Em `src/lib/confronto-engine.ts` (função `runConfronto`), o cruzamento por nNF + CNPJ usa a chave `${nNF}_${cleanCnpj(cnpjEmitente)}`. Porém:

- O **CNPJ do XML** (`cnpjEmitente`) é salvo **sem máscara** (vem direto do XML, 14 dígitos puros).
- O **CNPJ da planilha** vem formatado (ex: `12.345.678/0001-90`) e a função `cleanCnpj` é aplicada apenas no lado da planilha — mas no XML a string pode também ter caracteres não-numéricos dependendo da fonte. Mais importante: a chave usada para o XML em `xmlByNnfCnpj.set` **não passa por `cleanCnpj`** com a mesma normalização que `salvarXmls` faz quando persiste.

Resultado: na primeira execução (XMLs em memória, recém-parseados), o cruzamento direto frequentemente falha. Quando você reabre via "Adicionar XMLs", o caminho usado é `reconcileMissing`, que tem **4 estratégias de fallback** (chNFe → nNF+CNPJ → nNF único → CNPJ+valor), por isso funciona.

## Solução

Tornar `runConfronto` consistente com `reconcileMissing`:

1. **Normalizar CNPJ dos dois lados** ao construir o mapa `xmlByNnfCnpj` (aplicar `cleanCnpj` no CNPJ do XML também).
2. **Adicionar os mesmos fallbacks** que `reconcileMissing` já usa:
   - Match por `nNF` apenas, quando único no conjunto.
   - Match por `CNPJ + valor aproximado` quando a planilha não tem `nNF`.
3. Garantir que o lookup por `chNFe` continue prioritário.

## Arquivos alterados

- `src/lib/confronto-engine.ts` — refatorar `runConfronto` para usar a mesma lógica em camadas de `reconcileMissing` (chave normalizada + fallbacks).

Nenhuma mudança de UI, banco ou contratos. Comportamento esperado depois: o confronto já cruza certo na primeira tentativa, sem precisar reanexar.
