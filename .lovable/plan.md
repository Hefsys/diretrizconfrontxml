## Melhorias: Disnove (IPI), busca, fechamento de mês e base persistente de XMLs

Quatro melhorias integradas. Como o usuário já decidiu nas perguntas anteriores: **CNPJ da Disnove fica como flag por empresa** (mais flexível), **upload passa a exigir seleção da empresa** e o **fechamento congela TODAS as linhas** (OK + divergentes + canceladas + ausentes + não escriturados) com seus status finais.

---

### 1. IPI Disnove — somar colunas AA + AR ao Valor Contábil

A planilha do Dealernet traz IPI em colunas separadas. Para emitentes específicos (Disnove), o `vNF` do XML inclui o IPI, então o confronto precisa somar essas colunas.

- **Cadastro de empresas:** novo campo `soma_ipi_dealernet` (boolean, default `false`). Aparece como switch no formulário de empresa em `/empresas` ("Somar IPI da planilha Dealernet (colunas AA + AR) ao valor contábil").
- **Excel parser:** ler também as colunas AA (índice 26) e AR (índice 43) por posição absoluta — independente de cabeçalho — e armazenar em `vIpiAA` e `vIpiAR` no `ExcelNfeData`.
- **Engine:** ao casar uma linha, se o emitente da NF (CNPJ) corresponder a uma empresa cadastrada com `soma_ipi_dealernet = true`, comparar `valorContabil + vIpiAA + vIpiAR` contra `vNF`; caso contrário, comparar `valorContabil` direto (comportamento atual).
- O confronto recebe um `Set<string>` de CNPJs com a flag ativa, montado em tempo de processamento.

### 2. Campo de busca por número de NF

Input de texto na barra superior da tabela de Resultados (`ResultsSection.tsx`), ao lado dos chips de filtro. Filtragem em tempo real por `nNF` (substring), combinada com filtros de mês e status já existentes.

### 3. Empresa obrigatória no upload + persistência de XMLs

- **`UploadSection`:** novo `<Select>` no topo carregando empresas ativas do banco. Botão "Processar" desabilitado até uma empresa ser escolhida.
- **Tabela `xmls_armazenados`** (nova) com RLS por empresa:
  ```
  id uuid pk, empresa_id uuid not null fk empresas, ch_nfe text not null,
  n_nf text, serie text, dh_emi text, cnpj_emitente text, x_nome text,
  v_nf numeric, v_ipi numeric, cancelada boolean default false,
  xml_data jsonb,                  -- payload completo parseado
  uploaded_by uuid, created_at timestamptz default now(),
  unique (empresa_id, ch_nfe)
  ```
- **Fluxo no processamento:**
  1. XMLs novos do upload são inseridos (upsert por `empresa_id + ch_nfe` — duplicatas são ignoradas, não recarregadas).
  2. Antes do confronto, o sistema busca **todos** os XMLs já armazenados daquela empresa e mescla com os recém-enviados. Isso resolve o cenário de "NF emitida em mês X, escriturada em X+1".
- Cada upload subsequente acumula a base; o usuário pode reprocessar a planilha sem reanexar XMLs antigos.

### 4. Fechamento de mês — botão + relatório + histórico

- **Tabela `fechamentos_mensais`** (nova) com RLS por empresa:
  ```
  id uuid pk, empresa_id uuid not null fk empresas, competencia text not null, -- "2025-04"
  fechado_por uuid, fechado_em timestamptz default now(),
  resumo jsonb,            -- ConfrontoSummary
  resultados jsonb,        -- ConfrontoResult[] congelados (todas as linhas, todos os status)
  unique (empresa_id, competencia)
  ```
- **Botão "Fechar mês"** na tela de Resultados, visível apenas quando há mês selecionado (não em "Todos"). Pede confirmação ("o mês não poderá mais ser editado para esta empresa") e:
  1. Persiste o snapshot completo (todas as linhas com seus status) em `fechamentos_mensais`.
  2. Gera Excel com a lista completa via `exportResults` e dispara download.
- **Indicador visual:** chips de mês mostram um cadeado quando a competência já está fechada para a empresa selecionada; tentar reabrir mostra mensagem "Mês fechado em DD/MM/AAAA por …".
- **Nova rota `/fechamentos`** (link no header) listando fechamentos por empresa/competência, com botão para baixar novamente o Excel a partir do `resultados` salvo.

---

### Alterações de arquivos

**Banco (migrations):**
- `empresas`: adicionar coluna `soma_ipi_dealernet boolean not null default false`.
- Criar `xmls_armazenados` + RLS (select/insert/update por usuários autenticados da empresa, delete só admin).
- Criar `fechamentos_mensais` + RLS (mesmas regras).

**Front-end:**
- `src/lib/types.ts` — adicionar `vIpiAA`, `vIpiAR` em `ExcelNfeData`; tipos `XmlArmazenado`, `FechamentoMensal`.
- `src/lib/excel-parser.ts` — extrair colunas AA/AR por índice.
- `src/lib/confronto-engine.ts` — receber `cnpjsComIpi: Set<string>` e ajustar comparação.
- `src/lib/xml-storage.ts` (novo) — `salvarXmls`, `carregarXmlsDaEmpresa`, helpers de upsert.
- `src/lib/fechamentos.ts` (novo) — `fecharMes`, `listarFechamentos`, `baixarFechamento`.
- `src/components/UploadSection.tsx` — `<Select>` de empresa obrigatório.
- `src/components/ResultsSection.tsx` — input de busca por nº NF, botão "Fechar mês", indicador de mês fechado.
- `src/routes/index.tsx` — passar `empresaId` adiante; após processar, mesclar XMLs históricos.
- `src/routes/empresas.tsx` — switch `soma_ipi_dealernet` no formulário.
- `src/routes/fechamentos.tsx` (novo) — listagem + download de fechamentos anteriores.

### Observações importantes

- Os arquivos XML em si **não** são guardados (só o conteúdo parseado em JSONB). Se quiser guardar o XML cru no Storage, posso adicionar — diga depois.
- A flag IPI é por empresa (do **emitente**), não por empresa selecionada no upload — é o CNPJ da nota que decide se soma ou não. Se a Disnove ainda não estiver cadastrada como empresa, basta cadastrá-la com a flag ligada.
