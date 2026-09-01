# NF 504507 e as garantias da Disnove continuam como "Ausente no XML"

## O que a verificação mostrou

Consultei a base de XMLs e comparei com os arquivos enviados. Duas causas distintas, ambas confirmadas:

1. **A NF 504507 está gravada na empresa errada para essa análise.** A chave `2626 0811 8111 8900 0119 ...504507` foi importada em **DISNOVE MATRIZ** (CNPJ 11.811.189/0001-19) em 24/08. A análise em que ela aparece como ausente é de outra empresa, e o sistema só carrega XMLs da empresa selecionada — então esse XML nunca entra no confronto, por mais vezes que seja reimportado em outra filial.
2. **Nas notas de garantia da Disnove Arruda (140626, 140630, 140735, 140748, 141105, 141122, 141124, 141132) a empresa é o destinatário.** O emitente é a própria DISNOVE ARRUDA (11.811.189/0009-76) e o "CNPJ Emitente" que aparece na planilha é o do destinatário (Movida, LM Transportes, Mirabilândia etc.). O casamento por destinatário já foi implementado, mas **nenhum dos 4.955 XMLs da Arruda tem o CNPJ do destinatário gravado** (foram lidos antes desse ajuste, em 31/08). E o passo de casamento por nº + série é bloqueado quando o CNPJ do XML existe e é diferente do da planilha — então essas notas seguem presas em "Ausente".

Observação: as telas enviadas são do endereço publicado. Os ajustes recentes só valem lá depois de publicar.

## O que vou fazer

### 1. Casar notas de garantia mesmo sem o destinatário gravado
- Quando **nº da NF + série + valor** coincidem, aceitar o casamento **sem exigir o CNPJ** (três campos iguais já são prova suficiente).
- Quando o XML **não tem destinatário gravado**, deixar de bloquear o casamento por nº + série pela divergência de CNPJ (o CNPJ da planilha pode ser o do destinatário, que não foi lido).
- Vale nos três caminhos: confronto novo, "Adicionar XMLs" e "Adicionar Excel".

### 2. Enxergar os XMLs das outras filiais do mesmo grupo
Ao carregar a base de XMLs de uma empresa, incluir também os XMLs das empresas com o **mesmo CNPJ raiz** (os 8 primeiros dígitos) — matriz e filiais. Isso resolve a NF 504507 sem precisar reimportar nada, e evita esse tipo de crítica sempre que o arquivo foi subido na filial errada.

### 3. Reprocessar o destinatário dos XMLs já armazenados
Como o CNPJ do destinatário não existe nos registros antigos e não pode ser deduzido, na tela **XMLs** entra um botão "Reprocessar XMLs" que permite reenviar a pasta do mês e regravar os registros já existentes com os campos novos (o reenvio passa a sobrescrever, não ignorar).

### 4. Publicar
Publicar depois do ajuste, para o Leonardo ver o resultado no endereço definitivo.

## Detalhes técnicos

- `src/lib/confronto-engine.ts`: relaxar `cnpjCompatXml` nos passos 2b/2c (aceitar quando o XML não tem `cnpjDest`; aceitar 2c com valor exato sem checar CNPJ) em `runConfronto`, `reconcileMissing` e `reconcileExcel`.
- `src/lib/xml-storage.ts`: `carregarXmlsDaEmpresa` passa a buscar por lista de `empresa_id` das empresas com mesmo CNPJ raiz.
- `src/routes/xmls.tsx`: ação de reprocessamento (reenvio que sobrescreve `xml_data`).
- Sem mudança de banco.

## Como validar

Reabrir a análise de Ago/2026 da Disnove Arruda: as 8 notas de garantia enviadas devem virar OK (valores idênticos), e a NF 504507 deve casar com o XML da matriz, R$ 66.006,00 x R$ 66.006,00.
