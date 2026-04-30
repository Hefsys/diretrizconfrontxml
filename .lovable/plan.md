## Problema confirmado

Olhando as três imagens lado a lado, a NF 479664 (Volkswagen) prova que a lógica de "somar IPI" está errada na raiz — não é só o gatilho que está errado, é a soma em si:

- **Valor Total da NF no Dealernet**: R$ 1.256,61
- **vNF do XML**: R$ 1.256,61
- **Coluna AA da planilha RFS008**: R$ 1.256,61 ← já é o Valor Total da NF
- **Confronto retorna**: Valor Planilha R$ 2.772,28 (errado, inflado em R$ 1.515,67)

A diferença R$ 1.515,67 é exatamente `259,06 + ... + 31,41` (valores das colunas AO/AR que o parser lê como "IPI").

### Causa raiz

A coluna **AA do RFS008 é o próprio Valor Total da NF**, com IPI já embutido. As colunas AO ("ICMS ST RET ENTRADA") e AR ("VALOR IPI") são **detalhamento informativo**, distribuídas em duas linhas por NF, e **nunca devem ser somadas** ao valor contábil.

Ou seja, todo o ramo "se o XML tem IPI, somar AA + AR à planilha" está incorreto. A planilha RFS008 já entrega o valor final.

## Correção

### 1. `src/lib/confronto-engine.ts`
- Em `runConfronto`: remover o cálculo `valorPlanilhaAjustado = somaIpi ? row.valorContabil + vIpiAA + vIpiAR : row.valorContabil`. Usar diretamente:
  ```ts
  const valorPlanilha = row.valorContabil;
  const diff = Math.abs(valorPlanilha - matchedXml.vNF);
  ```
- Remover variável `somaIpi` e o uso de `vIpiAA`/`vIpiAR`.
- Em `reconcileMissing`: remover também a referência a `xml.vIPI` e `somaIpi` (atualmente já compara direto, só limpar o código morto).

### 2. `src/lib/excel-parser.ts`
- Remover a leitura de `row[26]` (AA) como IPI e `row[43]` (AR) como IPI — esses campos são lixo informativo no contexto do confronto. Manter o tipo por compatibilidade ou removê-lo (ver passo 3).

### 3. `src/lib/types.ts`
- Remover `vIpiAA` e `vIpiAR` de `ExcelNfeData` (não são mais usados em lugar nenhum).

### 4. `src/routes/empresas.tsx` e `src/routes/index.tsx`
- Remover o aviso "IPI somado automaticamente quando o XML tem IPI" (não é mais verdade — a comparação é sempre direta).
- Garantir que não sobrou nada referenciando `soma_ipi_dealernet` ou `vIpi*` no UI.

### 5. Banco de dados (`empresas.soma_ipi_dealernet`)
- A coluna pode ficar no banco por enquanto (não atrapalha). Drop opcional em limpeza futura.

## Comportamento esperado depois

Para a NF 479664:
- valorPlanilha = 1.256,61 (AA da planilha)
- valorXml = 1.256,61 (vNF do XML)
- diff = 0 → status **OK** ✅

Esse mesmo princípio vale para **toda** NF: o RFS008 já traz o valor final correto na coluna Valor Contábil.

## Fora de escopo

- Drop da coluna `soma_ipi_dealernet` no banco.
- Implementação dos status detalhados da especificação (OK NF 02, OK NF 06, etc.) — segue como evolução futura.
