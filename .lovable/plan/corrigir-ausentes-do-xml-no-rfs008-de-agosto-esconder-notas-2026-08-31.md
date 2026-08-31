# Corrigir "Ausentes do XML" no RFS008 de agosto + esconder notas zeradas

## O que a planilha de agosto revelou

Analisei o arquivo enviado (954 notas, período 01/08 a 24/08). Dois problemas confirmados na leitura:

1. **Esse relatório não traz CNPJ do emitente nem chave da NF-e** — só "Código Emitente" interno do Dealernet. Resultado: as 954 linhas entram sem CNPJ, e o confronto fica dependendo apenas do número da NF. Hoje a regra de segurança só aceita casamento por número quando aquele número é **único** dentro do lote de XMLs; quando dois fornecedores diferentes emitem NFs de mesmo número (comum), nada casa e a nota fica presa em "Ausente no XML" — inclusive ao usar "Adicionar XMLs".
2. **A coluna de CFOP não está sendo reconhecida** neste layout (o cabeçalho é "Codificação / Fiscal", não "CFOP"). Por isso 54 fretes (CFOP 1353/2353) e 130 lançamentos de ajuste (1949/2949) não recebem o tratamento automático que já existe no sistema — engordando a lista de ausentes.

## O que vou fazer

### 1. Casar as notas usando série (e valor) quando não há CNPJ
Adicionar dois novos níveis de casamento, aplicados nos três pontos do motor (confronto inicial, "Adicionar XMLs" e "Adicionar Excel"):
- **Número + série** — a planilha e o XML têm os dois; resolve a ambiguidade sem CNPJ.
- **Número + valor aproximado** (tolerância de R$ 0,01) — para quando a série divergir de formato.
- Só depois disso cai no antigo "número único".

### 2. Reconhecer a coluna de CFOP deste layout
Passar a detectar o CFOP pelo cabeçalho "Codificação/Fiscal" (e por posição fixa no RFS008 quando o cabeçalho não ajudar), para que fretes CT-e e ajustes voltem a ser classificados automaticamente como OK em vez de "Ausente".

### 3. Notas zeradas ocultas por padrão
- Linhas com Valor Contábil zerado passam a ser marcadas como **zeradas** e ficam **fora da tabela, dos contadores e do Excel exportado** por padrão.
- Um checkbox **"Mostrar notas zeradas (55)"** acima dos filtros permite exibi-las quando quiser conferir.
- Vale para novas importações **e** para os fechamentos já salvos: ao abrir uma análise antiga, o banner "Salvar correções" grava a reclassificação (fretes, ajustes e zeradas) no snapshot.

## Detalhes técnicos

- `src/lib/excel-parser.ts`: detecção de CFOP por "codificacao"/"fiscal" + fallback posicional; marcar `isZerada` quando `valorContabil === 0`.
- `src/lib/confronto-engine.ts`: novos passos de match (nNF+série, nNF+valor) em `runConfronto`, `reconcileMissing` e `reconcileExcel`; `sanitizeLegacyResults` passa a reclassificar fretes/ajustes/zeradas de snapshots antigos.
- `src/lib/types.ts`: campo `isZerada` em `ExcelNfeData`/`ConfrontoResult`.
- `src/components/ResultsSection.tsx`: estado `showZeradas`, filtro aplicado antes dos contadores/paginação, e exportação respeitando o filtro.
- Sem mudança de banco.

## Como validar

Reimportar o RFS008 de agosto com os XMLs do mês e conferir que a lista de "Ausente no XML" cai drasticamente (fretes e ajustes viram OK, notas casam por número+série) e que as 55 zeradas só aparecem com o checkbox ligado.
