

# Confronto NF-e — Diretriz Contabilidade

Aplicação web para confrontar XMLs de NF-e com planilhas de Registro de Entrada ICMS, identificando notas OK, divergentes e ausentes.

## Branding
- Cores da Diretriz: vermelho primário `#ED3237`, azul escuro `#10143D`
- Interface profissional, tema claro, com identidade visual alinhada à marca

## Dependência
- Adicionar **SheetJS (xlsx)** para leitura de .xlsx e .xlsb no browser

## Tela 1 — Upload e Configuração
- Dois cards lado a lado:
  - **Esquerdo**: Upload de múltiplos XMLs (drag & drop + botão), com contador
  - **Direito**: Upload de planilha .xlsx/.xlsb, com nome do arquivo
- Após upload da planilha: **dropdown para selecionar aba** (auto-detecta a aba com dados de NF se possível)
- Botão "Processar Confronto" habilitado quando ambos estiverem preenchidos
- Loading spinner durante processamento

## Parsing dos XMLs (client-side, DOMParser)
Extrair: chNFe (44 dígitos), nNF, série, dhEmi/dEmi, CNPJ emitente, xNome, vNF, vBC, vICMS, vBCST, vST, vIPI, vPIS, vCOFINS, vProd

## Parsing do Excel (SheetJS)
- Suporte a .xlsx e .xlsb
- Detecção automática da linha de header (busca por "Nº NF", "Chave", "CNPJ", "Valor" etc.)
- Mapeamento de colunas: Número NF, Série, Data, CNPJ, Nome Emitente, Chave NF-e, Valor Total, vBC, vICMS, vST

## Motor de Confronto
- Match primário por chNFe (44 dígitos exatos)
- Fallback por nNF + CNPJ emitente
- Classificações:
  - ✅ **OK** — chave bate, diferença ≤ R$0,01
  - ⚠️ **Divergente** — chave encontrada, valor diverge > R$0,01
  - ❌ **Ausente no XML** — linha da planilha sem XML correspondente
  - 🔵 **Não escriturado** — XML sem correspondência na planilha

## Tela 2 — Resultados
- **Cards de resumo** no topo: total planilha, total XMLs, OK, divergentes, ausentes, não escriturados
- **Filtros por status** (chips clicáveis: Todos / OK / Divergente / Ausente / Não escriturado)
- **Tabela** com colunas: Status (badge colorido), Nº NF, Série, Data, CNPJ, Nome Emitente, Valor Planilha, Valor XML, Diferença, Chave NF-e (truncada com tooltip)
- Linhas alternadas para legibilidade
- **Botão "Exportar Excel"** — gera .xlsx com resultado completo via SheetJS
- **Botão "Nova análise"** — volta à Tela 1

## Estrutura de Arquivos
- `src/routes/index.tsx` — página principal com estado de navegação Upload ↔ Resultado
- `src/components/UploadSection.tsx` — cards de upload
- `src/components/ResultsSection.tsx` — tabela e resumo
- `src/lib/xml-parser.ts` — parsing de XMLs
- `src/lib/excel-parser.ts` — parsing da planilha com SheetJS
- `src/lib/confronto-engine.ts` — lógica de confronto
- `src/lib/export-excel.ts` — exportação do resultado

