
## Problema

Hoje, na hora de comparar o **valor contábil da planilha (RFS008)** com o **vNF do XML**, o sistema soma o IPI das colunas AA e AR da planilha em **todas** as NFs de qualquer fornecedor que esteja marcado como "Soma IPI Dealernet" na empresa. Isso gera divergências falsas porque:

- Nem toda NF do mesmo fornecedor tem IPI.
- A especificação enviada deixa claro que a soma do IPI só se aplica quando a **própria NF tem IPI** (ex.: regras OK NF 02, OK NF 06, etc., só disparam quando `IPI_XML > 0`).

## Regra correta (por NF, não por CNPJ)

Para cada linha da planilha, ao comparar com o XML:

- Se `vIPI` do XML for **> 0** → comparar `valorContabil + vIpiAA + vIpiAR` com `vNF` do XML.
- Se `vIPI` do XML for **= 0** (ou ausente) → comparar `valorContabil` puro com `vNF` do XML.

Tolerância continua sendo `0,01` (igual à planilha original).

## Mudanças

### 1. `src/lib/confronto-engine.ts`
- Remover o parâmetro `cnpjsComIpi` da função `runConfronto`.
- Trocar a regra `somaIpi = cnpjsComIpi.has(cnpjKey)` por `somaIpi = (matchedXml.vIPI ?? 0) > 0`.
- Aplicar a mesma lógica também em `reconcileMissing` (reconciliação cross-month), que hoje compara direto sem somar IPI.

### 2. `src/routes/index.tsx`
- Remover a query que busca empresas com `soma_ipi_dealernet = true` e o `Set<string> cnpjsComIpi`.
- Chamar `runConfronto(allExcelData, todosXmls)` sem o terceiro argumento.

### 3. `src/routes/empresas.tsx` (opcional, mas recomendado)
- Manter o campo `soma_ipi_dealernet` no banco por compatibilidade, mas **ocultar** o checkbox no formulário e a coluna no card, já que não é mais usado pela lógica.
- Alternativa: remover a UI por completo. Recomendo ocultar primeiro (sem migration) para não quebrar dados existentes — depois podemos dropar a coluna em outra etapa.

### 4. Garantir que `vIPI` está sendo lido corretamente do XML
- Já existe o campo `vIPI` em `XmlNfeData` (`src/lib/types.ts`) e o parser preenche.
- Verificar rapidamente que o `xml-parser.ts` está somando o IPI de todos os itens (e/ou pegando do total) para que NFs com IPI tenham `vIPI > 0`. Se estiver inconsistente, ajustar.

### 5. NFs já armazenadas no banco
- Os XMLs salvos em `xmls_armazenados` guardam `xml_data` (jsonb) com o `vIPI` original, então a nova regra passa a valer automaticamente para reconciliações futuras — sem precisar de migration ou reprocessamento.

## Comportamento depois da mudança

- NF com IPI no XML → comparação inclui IPI (AA + AR) automaticamente, em qualquer fornecedor.
- NF sem IPI → comparação direta, sem somar nada.
- Não depende mais de marcar o fornecedor como "Soma IPI Dealernet" — a decisão é por nota.
- Falsas divergências em fornecedores marcados como "soma IPI" mas com NFs sem IPI desaparecem.

## Fora de escopo

- Implementar todos os status detalhados da especificação (OK NF 02, OK NF 04, OK NF 06, OK NF 06 VL ST, OK NF VD DIRETA, ERRORdat_Ent, Pessoa F., Transportes, CTE, etc.). Hoje o sistema só usa `ok / divergente / ausente_xml / nao_escriturado / cancelada`. Essa evolução é maior e merece um plano separado — se quiser, podemos seguir com ela depois.
- Drop da coluna `soma_ipi_dealernet` no banco (deixar para limpeza futura).
