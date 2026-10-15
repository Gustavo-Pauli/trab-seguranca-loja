# Validação

Última conferência: 15/10/2026, no Windows com Node 22.14 e pnpm 10.15.1.
Datas, escopos e resultados estão em
[evidencias-verificacao.json](evidencias-verificacao.json).

## Verificações executadas

| Verificação | Resultado |
|---|---|
| `pnpm typecheck` | Exit 0. |
| `pnpm build` | Exit 0; build Vite gerada. |
| `pnpm test:security` | 37 verificações aprovadas. |
| `pnpm examples:java --attachments <pasta dos anexos>` | 13 exemplos compilados/executados, todos com exit 0. |
| Casos focados do cliente HTTP e conferência dos cofres | 10 verificações aprovadas com dados sintéticos. |

A suíte de segurança cobre cadastro/QR, senha/TOTP, sessão, catálogo, compra,
preços confiáveis, contexto DB5 e os quatro ataques. Também verifica timestamps,
limite de tentativas, reutilização de TOTP, concorrência de nonce, reinícios,
logout, mudança de país e ausência de rotas de ataque no modo normal.
Respostas de pagamento em claro, com tag adulterada ou de outro pedido são rejeitadas.
Os resultados completos estão em [evidencias-http.json](evidencias-http.json).

Nos casos focados, foram distinguidas falhas de rede, JSON inválido e erros HTTP;
respostas nulas ou sem mensagem textual receberam uma mensagem padrão.
Cofres compatíveis foram aceitos; segredo incompatível, senha incorreta e falha
ao abrir o segundo cofre foram rejeitados. Esses casos foram executados por um
script local de conferência, sem acrescentar framework ou comando à aplicação.

Os exemplos Java usam as fontes originais dos anexos. A exceção do exemplo
AES-GCM após adulteração é esperada e tratada pelo próprio programa com exit 0.
[evidencias-java.json](evidencias-java.json) conserva stdout/stderr, sem semente
ou QR do exemplo TOTP.

## Instalação e execução

Uma nova extração do pacote, sem dependências, BIN, cofres ou bancos, passou em
`pnpm install --frozen-lockfile --offline`, typecheck e build. As dependências
vieram do cache local; a BIN continua sendo obtida dos anexos da professora.

Em outro diretório de dados isolado, o setup criou cofres novos, conferiu esses
cofres em uma segunda execução e `pnpm demo` iniciou os dois processos Express.
Os endpoints de saúde da loja e do gateway responderam HTTP 200.

No Chrome, foram conferidos login/cadastro e TOTP no desktop/celular, catálogo,
quantidades, compra aprovada, histórico, sessão após recarregar, logout e novo
login com senha/TOTP. A conta era sintética; o código foi calculado a partir
da chave manual, sem leitura física do QR. A aparência foi preservada.

## Limites e conferência da equipe

Os testes usam bancos/cofres isolados em `.data/`, sem reinicializar os dados existentes.
Não houve teste em outro computador, instalação sem cache, pagamento bancário,
deploy ou auditoria externa. O modo demo consulta a DB5 com o IP de cenário
configurado no servidor; esse IP não representa o endereço real do navegador.

Continuam pendentes a leitura do QR pelo celular, a revisão pessoal do código
e o ensaio coletivo. Registrem essas atividades e a identificação da equipe no
relatório antes de enviar ao Moodle.
