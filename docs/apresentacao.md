# Roteiro da apresentação

Antes: preencher identificação/revisão no relatório, preparar autenticador com
relógio sincronizado, executar os comandos do README e ensaiar com todos os integrantes.
Não mostre senha, semente TOTP ou senha dos cofres na transmissão.

```powershell
pnpm.cmd build
pnpm.cmd test:security
pnpm.cmd demo
```

Abra **http://127.0.0.1:3001**. A API da loja é 3001 e o gateway, outro processo,
é 4000. A DB5 e os cofres devem ter sido preparados pelo setup.

| Etapa | Ação e explicação | Arquivo/função para abrir |
|---|---|---|
| 1. Arquitetura | Mostrar React, loja, gateway e dois bancos. | `src/app/app.tsx`; `server/index.ts`; `gateway/index.ts`. |
| 2. Cadastro | Nome/e-mail/senha; verificador derivado e semente cifrada. | `server/modules/auth/auth.service.ts: registerUser`; `credentials.ts: hashPassword/encryptTotp`. |
| 3. Configurar TOTP | Escanear QR, tentar código errado e confirmar código válido. | `src/modules/auth/components/TotpForm.tsx`; `server/modules/auth/totp.ts: verifyTotp`. |
| 4. Login | Sair e entrar com senha + novo TOTP; sessão só após contexto. | `loginWithPassword`; `second-factor.service.ts: verifySecondFactor`; `session.ts: setSession`. |
| 5. IP/contexto | Testes → Localização falsa; mostrar IP consultado e declaração ignorada. | `server/modules/context/context.service.ts: requestLocation`; `shared/context/ip2location.ts: locate`; `policy.ts: decide`. |
| 6. Compra | Selecionar **2 cadernos**, alterar quantidade, total R$100 e finalizar; mostrar Pedidos. | `server/modules/orders/orders.service.ts: checkout`; `shared/catalog.ts: orderItems/totalCents`. |
| 7. Comunicação | Mostrar envelope nos detalhes do ataque e a resposta cifrada. | `server/modules/payments/payment.service.ts: pay`; `shared/protocol/encryption.ts: seal/open`; `key-derivation.ts: material`. |
| 8. Ataques | Replay, Alterar valor, TOTP inválido, Localização falsa; explicar cada retorno. | `security-demo.service.ts: runAttack/tamperAmount`; `gateway/modules/replay/nonce.repository.ts: acceptOnce`; `verifySecondFactor`; `requestLocation`. |
| 9. Gateway | Mostrar validações, reserva persistente e autenticação da resposta. | `gateway/modules/payments/payment.validation.ts: validatePayment`; `payment.service.ts: processPayment`; `server/.../payment.service.ts: verifyGatewayResponse`. |

Faça replay imediatamente após a compra, em até dois minutos. Esperado:
409 `INVALID_NONCE`; valor adulterado: 400 `INVALID_AUTH_TAG`; TOTP incorreto:
401 sem nova sessão; localização falsa: declaração ignorada e DB5 usada.
Após a janela, `INVALID_TIMESTAMP` também é um bloqueio correto. Não apague nonces
nem aumente a janela; faça outra compra para demonstrar nonce especificamente.

O IP `150.162.60.21` é cenário **configurado no servidor**, não o IP detectado do
navegador. A DB5 é consultada de verdade. Em normal, usa-se o socket; loopback tem
país nulo. Para mostrar mudança de país: encerre, `pnpm.cmd demo --ip 8.8.8.8`,
faça login na conta com referência BR e confira `COUNTRY_CHANGED`; depois retorne
ao demo padrão. Em `pnpm.cmd start`, as rotas de ataques não existem.

## Conceitos para explicar sem consultar o relatório

- **Scrypt:** deriva o verificador da senha com custo de memória; não cifra senha.
- **TOTP:** HMAC-SHA1 de um contador temporal, seis dígitos a cada 30 s; é o segundo fator.
- **PBKDF2:** deriva chave e IV a partir de segredo, salt e finalidade, separadamente em cada processo.
- **AES-GCM:** cifra conteúdo e autentica integridade/origem simétrica; plaintext só após tag válida.
- **Salt:** público e aleatório; muda o material derivado. Cofres guardam o segredo cifrado.
- **Nonce:** identifica a transação, é persistido e não pode ser consumido novamente.
- **IV:** participa da cifra; é derivado, não é o nonce de negócio nem um valor fixo.
- **Timestamp:** janela de ±120 s, complementar ao nonce para bloquear mensagens antigas/futuras.
- **IP2Location:** localização aproximada por IP, não GPS nem segundo fator; DB5 não tem ASN/organização.

O gateway **não valida diretamente o código TOTP**: valida a declaração autenticada
da loja, produzida a partir da sessão. Essa confiança não cobre uma loja comprometida.
Resposta sem autenticação ou de outro pedido deixa a compra não confirmada.
Se uma aprovação se perder na rede, não há reconciliação automática.

## Fechar a demonstração

Mostrar os resultados de `pnpm.cmd test:security` e a seção de IA do relatório.
Cada integrante deve explicar o que revisou e executou pessoalmente. Antes da
apresentação, confira o QR com o autenticador do celular e ensaie o fluxo completo.
Para estudar os anexos, use `examples:java` conforme o README; a exceção GCM após
tampering é esperada. Ctrl+C encerra os serviços. Após preencher os dados finais
do relatório, `pnpm.cmd zip` gera o arquivo a enviar ao Moodle.
