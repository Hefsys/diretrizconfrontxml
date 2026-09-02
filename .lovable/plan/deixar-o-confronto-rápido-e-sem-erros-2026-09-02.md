# Deixar o confronto rápido e sem erros

## O que está acontecendo (verificado)

- A base já tem **47.705 XMLs (51 MB)** e **9.484 linhas de planilha**.
- Ao rodar o confronto, o navegador **baixa todos os XMLs da empresa/grupo**, e baixa o campo `xml_data` inteiro (o JSON completo de cada nota) em páginas de 1.000 registros, **uma página por vez** — dezenas de idas ao servidor e vários MB por execução. É a maior causa da demora e dos erros/timeouts.
- Ao **selecionar a planilha**, o arquivo é lido e **todas as abas são convertidas linha a linha** para detectar o cabeçalho, na mesma thread da interface. A tela congela sem nenhum aviso de "carregando".
- O envio dos XMLs novos vai em **um único request gigante**, o que estoura limite/tempo quando o usuário anexa muitos arquivos.
- Índices do banco estão corretos — o problema é volume trafegado e trabalho na thread da interface, não SQL.

## Correções propostas

### 1. Baixar só o necessário da base de XMLs (ganho maior)
Em vez de baixar o JSON completo de cada nota, ler apenas os campos usados pelo confronto (chave, nº, série, data, CNPJ, nome, valor, IPI, cancelada, CNPJ do destinatário). Isso reduz o tráfego de dezenas de MB para poucos MB. Para isso, guardar o CNPJ do destinatário em coluna própria e preencher a partir dos dados já salvos (uma vez, no banco).

### 2. Buscar as páginas em paralelo
Descobrir o total e buscar as páginas simultaneamente (em lotes controlados), em vez de uma por vez. Mesmo volume, tempo muito menor.

### 3. Leitura da planilha sem congelar a tela
- Mostrar estado "Lendo planilha…" no card e desabilitar o botão enquanto lê.
- Detectar a aba correta olhando apenas as primeiras linhas de cada aba (não a planilha inteira).

### 4. Envio de XMLs em lotes com progresso
Salvar os XMLs novos em lotes (ex.: 500 por vez), com contador de progresso ("salvando 1.500 de 4.000"). Se um lote falhar, mostrar o erro real daquele lote e parar — sem repetir tentativas em loop.

### 5. Progresso e erros claros no confronto
Substituir o "Processando…" mudo por etapas visíveis: lendo XMLs → salvando → carregando base → comparando. Erros mostram a mensagem real (código e descrição), sem travar a tela e sem retentativa automática.

## Detalhes técnicos

- Migração: adicionar `cnpj_dest text` em `xmls_armazenados` + índice `(empresa_id)` já existente; backfill `cnpj_dest = xml_data->>'cnpjDest'`; gravar o campo em `salvarXmls`.
- `src/lib/xml-storage.ts`: `carregarXmlsDaEmpresa` passa a selecionar colunas planas (`ch_nfe, n_nf, serie, dh_emi, cnpj_emitente, cnpj_dest, x_nome, v_nf, v_ipi, cancelada`) e remontar `XmlNfeData`; paginação com `count: 'exact'` e páginas em paralelo (concorrência ~4); `salvarXmls` em chunks com callback de progresso.
- `src/lib/excel-storage.ts`: mesma paginação paralela para `carregarLinhasDaEmpresa`.
- `src/lib/excel-parser.ts`: `autoDetectSheet` usa `sheet_to_json` limitado às primeiras ~30 linhas (`range`), sem varrer a aba toda.
- `src/components/UploadSection.tsx`: estado `readingExcel` + `onProcess` recebendo progresso; parse dos arquivos XML com pool de concorrência para não bloquear.
- `src/routes/index.tsx`: exibir a etapa atual e a mensagem de erro real.

Sem mudança de layout, identidade visual, campos ou na lógica de comparação do confronto.
