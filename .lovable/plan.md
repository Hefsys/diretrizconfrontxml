# Divergências falsas: XML casado com nota de outro emitente

## O que o print mostra

Nas 10 linhas "Divergente" o Valor da Planilha e o Valor do XML não têm relação alguma (ex.: NF 1218 LWART R$ 196,00 x R$ 30.169,37; NF 1233 CPF 039.692.534-03 R$ 83,27 x R$ 28.000,00). Todas as linhas têm série "0" e a maioria tem CPF (11 dígitos) no lugar do CNPJ — ou seja, são documentos diferentes que só coincidem no número da NF.

O cliente está certo no diagnóstico: hoje o motor de confronto tem etapas de casamento que aceitam apenas **número da NF + série** (e outra apenas **número + valor**) quando o XML importado não traz o CNPJ do destinatário gravado. Nessas etapas a checagem de CNPJ é "frouxa": se o XML não tem destinatário, a diferença de CNPJ entre planilha e XML não bloqueia o casamento. Resultado: NF 1218 da planilha casa com um XML qualquer de nº 1218 de outro emitente.

## Correção

Tornar o CNPJ um critério obrigatório sempre que a planilha informar o documento do emitente:

1. Se a linha da planilha tem CNPJ/CPF, só casar com XML cujo emitente **ou** destinatário seja aquele mesmo documento (etapas por chave e por nº+CNPJ já fazem isso).
2. As etapas de fallback por "nº + série" e "nº + valor" passam a exigir a mesma compatibilidade de CNPJ; a regra frouxa (aceitar XML sem destinatário gravado) só continua valendo quando a planilha **não** informa CNPJ.
3. Linhas com CPF de pessoa física continuam com o tratamento atual (não existe XML de CNPJ correspondente, seguem como OK automático conforme regra já vigente) — deixam de ser casadas por engano com notas de empresas.
4. Aplicar a mesma regra nos três caminhos que casam registros: confronto inicial, "Adicionar/Reconciliar XMLs" e reconciliação de planilha, para que fechamentos já salvos possam ser recalculados com os botões existentes.

Efeito esperado no fechamento do print: as 10 divergências artificiais desaparecem; as notas realmente não encontradas passam a aparecer como "Ausente no XML" (ou OK automático, no caso de CPF/frete), e divergências reais de valor continuam sinalizadas.

## Detalhes técnicos

- `src/lib/confronto-engine.ts`: substituir `cnpjLooseXml` por `cnpjMatchXml` quando `row.cnpjEmitente` existe nas etapas 2b (nº+série) e 2c (nº+valor) de `runConfronto`, `reconcileMissing` e `reconcileExcel`; manter `cnpjLooseXml` apenas quando a linha não traz CNPJ.
- Nenhuma mudança de layout, identidade visual, campos, rotas, banco ou fluxo de upload.
