## Objetivo

Desconsiderar de "ausentes" as notas com **CFOP 2949** que tenham **valor contábil zerado**, tratando-as automaticamente como **OK** (linhas de ajuste/entrada sem valor financeiro, sem NF-e correspondente esperada).

## Regra

Uma linha é auto-OK quando:
- `cfop === '2949'` **E**
- `valorContabil === 0` (ou ausente)

Permanece a regra atual para CPF, `isFrete` e CFOPs de frete.

## Mudanças

### 1. `src/lib/excel-parser.ts`
- Criar nova constante exportada:
  ```ts
  export const CFOPS_AJUSTE_ZERADO = new Set<string>(['2949', '1949']);
  ```
  (incluo `1949` — entrada equivalente — para cobertura simétrica; se não quiser, removo)

### 2. `src/lib/confronto-engine.ts`
- Importar `CFOPS_AJUSTE_ZERADO`.
- Helper:
  ```ts
  const isAjusteZerado = (cfop?: string, valor?: number | null) =>
    !!cfop && CFOPS_AJUSTE_ZERADO.has(cfop) && (valor ?? 0) === 0;
  ```
- Em `runConfronto` (bloco do `else` quando não há XML), incluir no `autoOk`:
  ```ts
  const ajuste = isAjusteZerado(row.cfop, row.valorContabil);
  const autoOk = row.isFrete || cpf || ajuste;
  ```
  Rótulo quando `ajuste`: `'Ajuste/Estorno (CFOP 2949)'`.
- Em `sanitizeLegacyResults`, adicionar a mesma checagem para reclassificar fechamentos antigos:
  ```ts
  const ajuste = isAjusteZerado(r.cfop, r.valorPlanilha);
  if (!cpf && !cfopFrete && !r.isFrete && !nomeFrete && !nomeSeguro && !ajuste) return r;
  ```
  Rótulo: `'Ajuste/Estorno (CFOP 2949)'`.

### 3. Sem mudanças em UI
A reclassificação aparece pelo banner amarelo "Salvar correções" já existente.

## Resultado esperado

- Novas análises: linhas com CFOP 2949 e valor 0 entram como **OK**.
- Fechamentos antigos: ao abrir, banner mostra reclassificações adicionais; "Salvar correções" persiste.

## Observação

Se o valor **não** for zero, a linha CFOP 2949 continua sendo tratada normalmente (pode virar `ausente_xml` se não houver XML). Confirmar se essa é a intenção, ou se qualquer 2949 (independente do valor) deve ser ignorado.