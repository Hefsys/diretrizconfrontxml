## Objetivo

Permitir que o usuário envie planilhas de Registro de Entrada ICMS direto pela aba **XMLs**, armazenando as linhas na base por empresa (igual aos XMLs). Reupload mescla automaticamente, ignorando linhas duplicadas. No confronto, as linhas armazenadas serão reutilizadas — sem precisar reenviar a planilha toda vez.

## Mudanças

### 1. Banco — nova tabela `excel_linhas_armazenadas`
Migration criando:
- Colunas: `empresa_id`, `n_nf`, `serie`, `cnpj_emitente`, `nome_emitente`, `ch_nfe`, `data_entrada`, `data_documento`, `valor_contabil`, `v_bc`, `v_icms`, `v_st`, `cfop`, `sheet_name`, `competencia` (derivada de `data_documento`, formato `YYYY-MM`), `row_data` (jsonb com `ExcelNfeData` original), `uploaded_by`, `created_at`, `updated_at`
- Chave única: `(empresa_id, n_nf, serie, cnpj_emitente, data_documento)` para deduplicação no upsert
- GRANTs para `authenticated` e `service_role`
- RLS espelhando `xmls_armazenados` (view aberta a autenticados, insert pelo próprio uploader, update do uploader/admin, delete só admin)

### 2. Frontend — aba XMLs vira "Base de NF-e"
Em `src/routes/xmls.tsx`:
- Adicionar um **seletor de tipo** no topo (Tabs ou ToggleGroup): **XMLs** | **Planilhas (Excel)**
- Aba XMLs: comportamento atual (sem alteração visual relevante)
- Aba Planilhas:
  - Botão **"Adicionar Excel"** + seletor de planilha (igual ao fluxo do confronto: lê workbook, mostra abas, usuário escolhe quais importar)
  - Lista as linhas armazenadas da empresa selecionada, com filtros equivalentes (busca por nº NF/CNPJ/emitente, competência, CFOP)
  - Coluna de ações com exclusão por linha
  - Resumo: total de linhas, total de competências cobertas

### 3. Storage helper — `src/lib/excel-storage.ts` (novo)
Espelha `xml-storage.ts`:
- `salvarLinhasExcel(empresaId, uploadedBy, linhas)`: upsert com `onConflict` na chave única, `ignoreDuplicates: true`
- `carregarLinhasDaEmpresa(empresaId)`: retorna `ExcelNfeData[]` reconstruídas a partir de `row_data`
- `mesclarLinhas(a, b)`: dedup por `n_nf+serie+cnpj+data`

### 4. Confronto — usa base armazenada automaticamente
Em `src/routes/index.tsx` (`handleProcess`):
- Após `parseSheet`, salvar as novas linhas via `salvarLinhasExcel`
- Carregar linhas históricas da empresa via `carregarLinhasDaEmpresa` e mesclar com as recém-parseadas antes de chamar `runConfronto`
- Toast informando quantas linhas novas foram salvas e quantas históricas foram consideradas

A planilha continua opcional no upload do confronto — se o usuário só envia XMLs, o confronto roda contra as linhas já armazenadas da empresa.

## Detalhes técnicos

**Deduplicação:** chave única composta `(empresa_id, n_nf, serie, cnpj_emitente, data_documento)`. Linhas sem `n_nf` numérico já são filtradas pelo `parseSheet`, então não chegam à base.

**Competência:** derivada no momento do insert a partir de `data_documento` (parse `DD/MM/YYYY` → `YYYY-MM`), permitindo filtro por mês na listagem.

**RLS:** mesma postura de `xmls_armazenados` — qualquer autenticado vê/insere; apenas uploader/admin atualiza; só admin exclui (o botão de excluir na UI fica visível mas falhará para não-admin — manter consistente com XMLs).

**Sem mudança de tipos:** `ExcelNfeData` já existe e cobre todos os campos necessários.

## Arquivos tocados
- `supabase/migrations/<nova>.sql` (criar tabela + GRANTs + RLS)
- `src/lib/excel-storage.ts` (novo)
- `src/routes/xmls.tsx` (adicionar tabs XML/Excel + UI de upload e listagem)
- `src/routes/index.tsx` (integrar carregamento/salvamento de linhas no confronto)
