## Diagnóstico

Verifiquei o fechamento aberto (`e44d246f…`). Os **193 ausentes** se distribuem assim:

| Emitente | Qtd | Tipo real |
|---|---|---|
| FERNANDO G. DE BARROS TRANSPORTES | 66 | CT-e (frete) |
| VOLKSWAGEN DO BRASIL LTDA | 55 | NF-e real (XML faltando ou não importado) |
| VALE RIO TRANSPORTE RODOVIÁRIO | 30 | CT-e |
| ALMEIDA TRANSPORTE E LOGÍSTICA | 21 | CT-e |
| TRANSPORTES NACIONAL / EXATA / NACIONAL / PROGRESSO / LSLOG | 17 | CT-e |
| YLM SEGUROS / ZURICH SEGUROS | 2 | Apólice (sem NF-e) |
| DISNOVE DISTRIBUIDORA | 1 | NF-e real |

Ou seja: **~135 são CT-e/seguros** (deveriam estar OK) e **~56 são NF-e reais** (Volkswagen + Disnove) que realmente estão sem XML correspondente.

**Por que o sanitizador automático não pegou os 135**: este fechamento foi salvo **antes** da alteração que persiste `cfop` e `isFrete` em cada linha. Como o JSON salvo não tem esses campos, o `sanitizeLegacyResults` atual só consegue reclassificar quando o CNPJ é CPF (11 dígitos) — e nenhum aqui é.

Resposta direta: **não, 193 não está correto** — o número real esperado fica em torno de 56 (apenas Volkswagen + Disnove).

## Plano

### 1. Heurística por nome para fechamentos legados

Em `src/lib/confronto-engine.ts → sanitizeLegacyResults`, adicionar fallback por nome do emitente quando `cfop`/`isFrete` não existem no resultado salvo:

- Reclassificar como **OK** quando `nomeEmitente` contém (case-insensitive, sem acento) qualquer um de:
  - `transporte`, `transportes`, `transportadora`, `logistica`, `cargo`, `frete` → marcado como `CT-e (Frete)`
  - `seguros`, `seguradora` → marcado como `Apólice de Seguro`

Manter as regras atuais (CPF, `isFrete`, `cfop` em `CFOPS_FRETE_IGNORADOS`) — a heurística de nome é um fallback adicional só para linhas legadas sem `cfop`.

### 2. Banner de correções (já existente)

O banner amarelo "Salvar correções" existente em `fechamentos_.$fechamentoId.tsx` continuará funcionando — ao abrir este fechamento, mostrará "~135 linha(s) reclassificada(s)" e o usuário decide se grava no banco.

### 3. Sem mudanças em novos fechamentos

Análises feitas após a alteração anterior já persistem `cfop`/`isFrete` corretamente, então este fallback só afetará dados antigos.

## Arquivos a alterar

- `src/lib/confronto-engine.ts` — adicionar regex de nome dentro de `sanitizeLegacyResults`.

## O que continuará ausente após o fix

As ~56 linhas de **Volkswagen do Brasil** e **Disnove**: estas são NF-e reais e o XML não foi encontrado. Caberá ao usuário importar os XMLs faltantes (a tela de XMLs / upload já trata isso) — não é caso de reclassificação automática.