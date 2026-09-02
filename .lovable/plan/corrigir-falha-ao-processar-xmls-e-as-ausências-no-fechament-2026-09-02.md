# Corrigir "Falha ao processar XMLs" e as ausências no fechamento

## O que foi verificado na base

- As notas da tela (3439851, 3438533, 3438490, 3438491, 3438492 — Yamaha, série 1, 05/08/2026) **já estão gravadas na base**, na empresa COBARSA GOIANA (CNPJ 11.696.408/0008-32), como emitente Yamaha e destinatário Goiana. Ou seja, a importação dos XMLs funcionou.
- Portanto as 28 "Ausentes" do fechamento são resíduo do snapshot salvo: o fechamento foi gravado antes desses XMLs entrarem, e a tentativa de reconciliar agora está caindo no erro "Falha ao processar XMLs".
- Esse erro é exibido por um `catch` genérico que descarta a mensagem real, então **a causa exata ainda não está confirmada**. Ela pode estar na leitura dos arquivos ou na gravação em lote — só o erro real dirá.
- Observação importante de valor: nessas notas o valor da planilha é menor que o valor do XML (ex.: 25.818,65 x 26.626,82 — diferença de 808,17, compatível com IPI). Quando a reconciliação passar a rodar, essas linhas devem sair de "Ausente" e aparecer como **Divergente**, não como OK.

## Correções propostas

### 1. Mostrar o erro real (primeiro passo, obrigatório)
Ao adicionar XMLs (tanto no Confronto quanto dentro de um fechamento), a mensagem passa a trazer a etapa e o erro real: "Falha ao ler os XMLs: …", "Falha ao salvar na base (lote 3, código): …", "Falha ao reconciliar: …". Nada de mensagem genérica, sem retentativa automática e sem travar a tela.

### 2. Reconciliar usando a base, não só os arquivos anexados
Hoje o botão só compara com os arquivos que o usuário acabou de anexar. Como as notas já estão na base, será adicionada a ação **"Reconciliar com a base de XMLs"** no fechamento e no confronto: carrega os XMLs já armazenados da empresa e do grupo (mesma raiz de CNPJ) e reprocessa apenas as linhas ausentes do mês/filtro selecionado, atualizando o fechamento salvo. Isso resolve as ausências sem depender de reanexar arquivos.

### 3. Progresso visível no envio
O envio de XMLs mostra o andamento em lotes ("salvando 1.500 de 4.000") e, se um lote falhar, informa qual lote e o motivo, parando ali.

## Detalhes técnicos

- `src/components/ResultsSection.tsx`: em `processXmlFiles`, separar os `try` por etapa (parse / salvar / reconciliar) e propagar `err.message` ao toast; usar o callback de progresso de `salvarXmls`; novo handler `reconciliarComBase` que chama `carregarXmlsDaEmpresa(empresaId, onProgress)` e `reconcileMissing(results, base, monthFilter)`, seguido de `onUpdate` para persistir o snapshot.
- Botão novo ao lado de "Adicionar XMLs", mesmo estilo `variant="outline"` já usado — sem alteração de layout, identidade visual, campos ou da lógica de comparação.
- `src/lib/xml-storage.ts` já expõe paginação paralela e progresso; nenhuma mudança de schema necessária.
