# Erro do Eliel ao salvar XMLs

## Causa
Quando o Eliel processa o confronto, o sistema grava os XMLs na base. Se um XML já existe, o sistema atualiza o registro em vez de criar outro. Hoje, só quem enviou o XML ou um administrador pode alterá-lo. Os XMLs da Disnove foram enviados por outro usuário, e o Eliel é um usuário comum. Por isso a gravação é bloqueada e aparece a mensagem "new row violates row-level security policy".

A tabela de planilhas armazenadas tem a mesma regra, então o Eliel também teria esse erro ao reenviar planilhas.

## Correção
- Todo usuário conectado poderá atualizar XMLs e linhas de planilha já armazenados. É a mesma regra que já vale para empresas e fechamentos.
- A exclusão continua liberada só para administradores.
- O campo "enviado por" continua sendo gravado no primeiro envio.
- O layout e o fluxo do sistema não mudam.

## Detalhes técnicos
Uma migração troca as políticas de UPDATE "Uploader or admin can update ..." de `xmls_armazenados` e `excel_linhas_armazenadas` por `USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)`. Depois, a gravação será validada com um usuário que não é administrador.
