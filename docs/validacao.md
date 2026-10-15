# Validação

Conferência de 15/10/2026, no Windows com Node 22.14 e pnpm 10.15.1.
Datas, escopos e resultados estão em
[evidencias-verificacao.json](evidencias-verificacao.json).

## Verificações executadas

| Verificação | Resultado |
|---|---|
| `pnpm typecheck` | Exit 0 na pasta original e na cópia extraída. |
| `pnpm build` | Exit 0 nas duas pastas. |
| `pnpm test:security` | 38 verificações aprovadas nas duas pastas. |
| `pnpm examples:java --attachments <pasta dos anexos>` | 13 exemplos compilados/executados, todos com exit 0. |
| Cenários HTTP na instalação limpa | 18 grupos de asserções aprovados, além de seis casos de requisição malformada. |
| Banco e setup incompleto | Migração preservou registro antigo; setup com apenas um cofre abortou sem alterá-lo. |
| Cliente HTTP e cofres | 10 verificações aprovadas com dados sintéticos. |

A suíte cobre cadastro/QR, senha/TOTP, sessão, catálogo, compra, preços confiáveis,
contexto DB5 e os quatro ataques. Verifica também timestamps, tentativas e reuso
de TOTP, concorrência de nonce, reinícios, logout, mudança de país e modo normal.
Respostas em claro, com tag adulterada ou de outro pedido são rejeitadas.
Resultados completos: [evidencias-http.json](evidencias-http.json).

A revisão encontrou JSON inválido e payload excessivo retornando 500 no gateway.
O tratamento foi corrigido para 400 `INVALID_JSON` e 413 `PAYLOAD_TOO_LARGE`,
com regressão incorporada à suíte. Nenhuma verificação criptográfica foi relaxada.

Os exemplos Java usam as fontes originais dos anexos. A exceção após adulteração
no exemplo AES-GCM é esperada; exit 0 não significa ausência dessa exceção.
[evidencias-java.json](evidencias-java.json) registra as saídas, sem semente/QR TOTP.

## Instalação e execução do zero

O ZIP foi extraído em uma pasta nova, sem dependências, BIN, cofres ou bancos.
`pnpm install --frozen-lockfile` criou `node_modules`, reutilizando o cache local.
Sem DB5, o setup falhou antes de pedir senha. Com a base dos anexos, copiou o
arquivo e criou os dois cofres por senha/confirmação interativas. O setup repetido
conferiu os cofres sem alterar seus arquivos.

O launcher iniciou dois processos independentes em demo e normal. O binding
SQLite abriu; as tabelas, os campos de sessão e a integridade dos bancos foram
conferidos. Uma base antiga sintética recebeu os campos novos sem perder o registro.

Os cenários adicionais conferiram APIs sem sessão, JSON de formato incorreto,
cadastro duplicado, senha/TOTP incorretos, carrinhos inválidos, preço/usuário
forjados, compra de R$100 e isolamento entre contas. Os erros de carrinho não
criaram pedidos. Reiniciar preservou conta, sessão, TOTP e pedido; novo login
continuou exigindo segundo fator. No normal, endpoints de ataque ficaram ausentes,
o IP forjado foi ignorado e a mudança de contexto bloqueou checkout sem novo pedido.

O Chrome carregou o formulário de login da cópia limpa. Nesta revisão, cadastro,
TOTP e compra foram verificados por HTTP; não houve leitura física do QR.

## Conferência da equipe

Os dados são sintéticos e isolados em `.data/`; os dados da instalação original
foram preservados. O demo consulta a DB5 com IP de cenário definido no servidor,
que não representa o endereço real do navegador.

Não houve instalação em outro computador ou sem cache, deploy, pagamento bancário
ou auditoria externa. Antes de enviar ao Moodle, preencham identificação e revisão
humana no relatório, leiam o QR com um celular e ensaiem com todos os integrantes.
Depois das edições manuais, gerem novamente o ZIP com `pnpm.cmd zip`.
