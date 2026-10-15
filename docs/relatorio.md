# Loja virtual e gateway de pagamento seguro

**UFSC — INE5680 — Segurança da Informação**

**Integrantes:** [preencher nomes e matrículas]

Este trabalho implementa uma loja acadêmica e um gateway de pagamento simulado,
conforme o enunciado da disciplina. A entrega reúne código-fonte, relatório e
documentação; a demonstração será realizada na apresentação da equipe.

## 1. Arquitetura da aplicação

O frontend usa React, Vite, TypeScript e Tailwind CSS. A loja é uma API Express na porta 3001;
o gateway é outro processo Express, na porta 4000. `server/index.ts` e
`gateway/index.ts` inicializam seus respectivos serviços. Rotas, regras e
persistência estão separadas nos módulos, sem ORM ou framework de autenticação.

`loja.sqlite` mantém usuários, sessões, referência contextual e pedidos;
`gateway.sqlite` mantém nonces e pagamentos aprovados. O gateway não acessa o
banco nem a memória da loja. `shared/` contém fontes do protocolo, catálogo e
política contextual comuns; cada processo inicializa seu próprio estado.

Na execução compilada, Express serve frontend e API na mesma origem. No
desenvolvimento, Vite usa proxy para a API. Os serviços escutam apenas em loopback.
O mapa de módulos está em [arquitetura.md](arquitetura.md), e o encadeamento de
funções em [COMO_FUNCIONA.md](COMO_FUNCIONA.md).

## 2. Protocolo de comunicação

O navegador envia IDs de produtos e quantidades a `/api/checkout`. A loja obtém
usuário e autorização da sessão e calcula preços a partir do catálogo confiável,
em centavos inteiros. O pedido é persistido como `PENDING`, contendo usuário,
identificador, itens e total. O histórico expõe `order_id`, `user_id`, `items` e
`total`, além de `total_cents` usado internamente.

`preparePayment` monta pedido, usuário, valor em reais/centavos, BRL, nonce,
timestamp, itens, localização e declaração de autorização. `seal` produz o envelope:

```json
{ "version": 1, "salt": "base64", "ciphertext": "base64", "tag": "base64" }
```

Não são transmitidos senha do usuário, semente TOTP, segredo inicial, chave AES
ou IV. O gateway chama `open` e só utiliza o plaintext após `decipher.final()`
verificar a tag. `validatePayment` confere formato, sessão declarada e sua
validade temporal, prova de 2FA, timestamp, moeda, valor, itens e contexto.
`acceptOnce` verifica a unicidade da transação.

A resposta de uma mensagem autenticada também é cifrada, no domínio `response`,
com pedido, nonce, status, timestamp e motivo de bloqueio. A loja exige autenticação
da resposta e correspondência de pedido/nonce, janela temporal e HTTP antes de
registrar `APPROVED` ou `BLOCKED`. Resposta sem tag válida, de outro pedido ou
falha de comunicação resulta em `ERROR`/não confirmado. Um erro de integridade
de entrada pode retornar 400 `INVALID_AUTH_TAG` em claro, mas esse retorno não
determina um estado definitivo do pedido; o painel demo apenas o exibe.

**Limite de confiança:** o gateway valida uma declaração da loja protegida por
AEAD. Ela contém usuário, confirmação de senha/TOTP, contador aceito e tempos da
sessão; é construída no servidor e não copiada do JSON do navegador. O gateway
confere essa declaração e a coerência do contador com a emissão da sessão, mas
não recebe a semente nem valida diretamente o código TOTP. A garantia pressupõe
loja e segredo inicial íntegros; não resiste ao comprometimento desses elementos.

## 3. Mecanismos criptográficos utilizados

| Finalidade | Algoritmo e parâmetros |
|---|---|
| Verificador de senha | Scrypt: N=16384, r=8, p=1; salt aleatório de 16 bytes; saída de 64 bytes; comparação com `timingSafeEqual`. |
| Semente TOTP em repouso | Scrypt da senha com prefixo `totp:` e salt independente de 16 bytes; saída de 44 bytes; AES-256-GCM e AAD com ID do usuário. |
| Cofres e mensagens | PBKDF2-HMAC-SHA512, 210.000 iterações; salt aleatório de 32 bytes; saída de 44 bytes: chave de 32 e IV de 12. |
| Criptografia autenticada | AES-256-GCM, tag de 16 bytes; AAD vincula versão, finalidade e salt. |
| Sessões | Token aleatório de 32 bytes; hash SHA-256 no SQLite; cookie HttpOnly/SameSite=Strict; validade de 12 horas. |

Scrypt acrescenta custo de memória e CPU à tentativa de senhas; nesta configuração,
o custo principal de memória é aproximadamente 16 MiB. Os parâmetros foram
escolhidos para a execução local e não representam um benchmark de resistência
em todas as máquinas. O verificador/salt permite conferir a senha sem armazenar
a senha original. A semente TOTP precisa ser recuperada para calcular o HMAC,
por isso é cifrada sob material derivado da senha e vinculado ao usuário.

**Provisionamento e seção 12 do enunciado:** o setup gera um segredo inicial
aleatório de 32 bytes e o grava em dois cofres separados, cifrados com a senha de
desbloqueio e salts independentes. O uso do mesmo segredo é uma decisão explícita
de provisionamento para permitir derivação nos dois lados. Em máquinas distintas,
cada cofre deve ser instalado no respectivo serviço e a senha entregue ao operador
por meio confiável; esse provisionamento entre máquinas não foi testado fisicamente.

O launcher recebe a senha sem eco, verifica os cofres e a envia por stdin aos
dois processos. Cada serviço abre seu próprio cofre. A senha e o segredo não vão
em argumentos, variáveis de ambiente ou código do React. Durante a operação,
o segredo de derivação fica na memória de cada processo; **chave AES e IV são
recalculados localmente a cada cifragem/decifragem**, a partir do segredo, salt e
finalidade. O buffer derivado é zerado ao terminar.

Cada cifragem usa salt novo. Chave e IV não são fixos, globais ou persistidos em
claro. O segredo persistido fica cifrado; salt, versão e tag são metadados públicos
do envelope. Os domínios `payment`, `response`, `vault:shop` e `vault:gateway`
separam usos da KDF e impedem apresentar uma resposta como pagamento ou trocar
cofres entre papéis. AES-GCM fornece confidencialidade, integridade e autenticidade
simétrica; não é assinatura digital nem proteção contra replay por si só.

## 4. Funcionamento do TOTP

`generateTotpSecret` gera 20 bytes aleatórios e os codifica em Base32. O QR usa
URI `otpauth://`, SHA-1, seis dígitos e período de 30 segundos. O cálculo segue
[RFC 4226](https://www.rfc-editor.org/rfc/rfc4226) e
[RFC 6238](https://www.rfc-editor.org/rfc/rfc6238): contador temporal, HMAC-SHA1
sobre oito bytes big-endian, truncamento dinâmico e módulo 10⁶. SHA-1 é usado
no HMAC do TOTP para interoperabilidade, não para armazenar senhas.

Após senha válida, a loja decifra a semente e cria um desafio temporário ligado
ao IP, válido por cinco minutos e limitado a cinco tentativas. `verifyTotp`
aceita o período atual e ±1. `verifySecondFactor` exige também contexto permitido
e consumo atômico do contador com `UPDATE ... WHERE totp_last_counter < ?`.
Só então a rota chama `setSession`. Códigos incorretos/reutilizados não criam
nova sessão; os desafios da conta são descartados após autorização.

A semente/QR só é retornada enquanto a habilitação estiver pendente. O banco a
mantém cifrada; em login de conta habilitada ela não é retornada. Desafios estão
em memória e expiram no reinício; a habilitação e o último contador persistem.

## 5. Integração com IP2Location

A consulta é local, com `ip2location-nodejs` e `IP2LOCATION-LITE-DB5.BIN`. O
startup confere existência e tipo da base. `locate` retorna IP, país, região,
cidade e coordenadas aproximadas quando disponíveis. ASN/organização ficam
nulos, pois não existem na DB5. Não há consulta à API remota em runtime.

No modo normal, o IP vem de `req.socket.remoteAddress`, com `trust proxy=false`.
Body, query e `X-Forwarded-For` não escolhem o endereço. Em loopback, a localização
pública permanece nula. O proxy Vite também representa uma conexão local e não
é tratado como prova do IP real do navegador.

No demo, `150.162.60.21` é configurado no startup do servidor e identificado como
`server-demo`; a consulta à DB5 é real, mas o endereço é um cenário controlado.
Não é apresentado como IP detectado do computador. O gateway reconsulta a DB5
para o IP transportado sob AEAD e compara os campos recebidos.

Loja Segura uses the IP2Location LITE database for [IP geolocation](https://www.ip2location.com).
O ZIP não redistribui a BIN; o procedimento para usar os anexos está no README.

## 6. Geolocalização como contexto de segurança

Depois de senha/TOTP válidos, o primeiro contexto público é registrado como
referência. Mesmo país é permitido; mudança de região recebe `REGION_CHANGED`;
mudança de país bloqueia com `COUNTRY_CHANGED`. IP público não resolvido recebe
`UNKNOWN_LOCATION` e é bloqueado. O checkout reconsulta contexto e exige o mesmo
IP da sessão.

Conexão local é uma exceção explícita para uso na própria máquina: permitida
sem referência pública ou com referência local. Uma conta com referência pública
não é automaticamente rebaixada para loopback. A transição local para primeiro
contexto público exige nova autenticação com segundo fator.

IP2Location é contexto adicional, não segundo fator nem GPS. NAT, VPN, redes
móveis e atualização da base limitam a precisão e podem causar bloqueios legítimos.

## 7. Proteção contra replay

Cada pagamento contém nonce de 32 bytes aleatórios em hex e timestamp inteiro
em segundos. O gateway aceita uma janela de ±120 segundos. O nonce transacional
identifica a operação e impede reprocessamento; o IV de 12 bytes participa da
cifra e é derivado pela KDF. São valores com funções distintas.

`acceptOnce` consulta/reserva o nonce e grava aprovação na mesma transação SQLite,
sem `await` entre operações. Nonce e pedido têm unicidade por chave primária.
Os registros persistem após reinício: replay de mensagem aprovada continua
bloqueado, e o mesmo pedido não é pago novamente com nonce diferente.

Timestamp limita mensagens antigas/futuras; nonce impede repetição dentro da
janela. Como timestamp é verificado primeiro, replay antigo pode receber
`INVALID_TIMESTAMP` antes de chegar à verificação do nonce.

## 8. Ataques realizados

| Ataque e ação executada | Resultado esperado | Resultado observado |
|---|---|---|
| Replay: reenviar exatamente o envelope aprovado. | Bloqueio por nonce já usado ou tempo vencido. | 409 `INVALID_NONCE`, inclusive após reinício do gateway. |
| Valor: alterar três bytes do ciphertext de R$100 para R$1000, mantendo salt/tag. | Falha da autenticação GCM. | 400 `INVALID_AUTH_TAG`. |
| TOTP: enviar seis dígitos incorretos após desafio real de senha. | Rejeitar autenticação. | 401, sem criação de cookie/sessão. |
| Localização: enviar IP/país/cidade falsos e header forjado. | Ignorar declaração em favor da origem confiável. | Consulta DB5 de 150.162.60.21/BR no demo; socket 127.0.0.1/país nulo no normal. |

Na adulteração, `100` é trocado por `1e3`, representação JSON de 1000 com o mesmo
tamanho. A demonstração usa plaintext conhecido para encontrar o offset e
altera somente a cifra capturada; não recalcula a tag. O gateway não chega à
validação do valor porque a autenticação falha primeiro. O teste separado de
pedido inconsistente, produzido com tag válida pelo emissor de teste, recebe
`INCONSISTENT_ORDER`. O painel exibe respostas reais, com detalhes expansíveis.

## 9. Resultados dos testes

Na revisão final, `pnpm typecheck` e `pnpm build` passaram, e `pnpm test:security`
concluiu **37 verificações**. Incluem cadastro/QR, senha/TOTP, contexto, catálogo,
compra, quatro ataques, timestamps vencido/futuro, contador reutilizado, limite
de tentativas, concorrência do nonce, reinícios, logout e falhas de resposta.
As verificações de resposta rejeitam aprovação/bloqueio em claro, tag alterada e
resultado autenticado de outro pedido. Os vetores HOTP/TOTP conhecidos também passaram.

Os **13 exemplos Java** foram novamente compilados/executados a partir dos
anexos. A exceção de integridade do exemplo AES-GCM após adulteração é esperada
e está registrada no stderr; exit 0 nesse exemplo não significa ausência de exceção.
Os testes usam dados sintéticos isolados e não apagam usuários/cofres existentes.
Resultados, ambiente e conferência da instalação limpa estão em
[validacao.md](validacao.md), [evidência HTTP](evidencias-http.json) e
[evidência Java](evidencias-java.json).

Limites: execução local no Windows, sem pagamento bancário, deploy, auditoria
externa ou teste em dois computadores físicos. A leitura do QR por telefone e
o ensaio pelos integrantes permanecem pendentes. HTTP local não fornece TLS ao
navegador. Se o gateway aprovar e a resposta se perder, a loja registra `ERROR`;
não há reconciliação automática nem garantia de exatamente uma compra ponta a
ponta. Confira pedidos antes de repetir. Capturas de demo/desafios não persistem.

## 10. Utilização de inteligência artificial

- **Ferramentas:** ChatGPT na etapa inicial, conforme o histórico informado, e
  Codex para implementação, revisão, verificações e documentação.
- **Prompts:** consolidados em cinco objetivos: corrigir a inicialização e completar
  o enunciado; refatorar a Loja Segura para módulos didáticos preservando segurança;
  realizar esta revisão final sem nova reestruturação, com relatório conciso e
  teste da instalação/pacote; migrar os estilos para Tailwind preservando a interface;
  pesquisar critérios de revisão e enxugar comentários e textos redundantes.
  Foram fornecidos o PDF, os anexos e os requisitos
  detalhados de stack, mecanismos e demonstrações.
- **Código gerado/alterado:** autenticação, protocolo, contexto, fluxo de pedidos,
  gateway, frontend modular, scripts e documentação receberam assistência de IA.
  As primitivas são de `node:crypto`; os exemplos Java foram estudados/executados
  separadamente, sem transplantar seus valores fixos para a aplicação.
- **Participação humana:** o aluno forneceu materiais/logs e definiu/revisou escopo.
  Alterações manuais dos integrantes não foram informadas. **[Preencher modificações,
  revisão e execuções efetivamente realizadas pela equipe; não atribuir testes do agente ao grupo.]**
- **Erro/limitação:** o código assistido por IA aceitava bloqueio em claro como
  resultado definitivo quando os identificadores coincidiam. O comportamento foi
  reproduzido e corrigido para exigir resposta autenticada; três casos específicos
  de resposta foram acrescentados à suíte existente.
- **Verificação:** o agente revisou código/PDF, executou asserções HTTP, consultas
  SQLite, reinícios, exemplos e instalação limpa. O grupo deve repetir a execução,
  revisar os mecanismos e registrar sua validação pessoal antes da apresentação.
