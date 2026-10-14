# Validação final

Os resultados desta entrega são registrados por execução, sem reutilizar evidências
históricas como prova. Versões e códigos de saída estão em
[evidencias-verificacao.json](evidencias-verificacao.json).

## Código e segurança

`pnpm typecheck`, `pnpm build` e `pnpm test:security` passaram na revisão final.
A suíte concluiu **37 verificações**, detalhadas em
[evidencias-http.json](evidencias-http.json). Abrange cadastro/QR, senha, TOTP,
sessão, catálogo, pedido, preços confiáveis, contexto DB5, quatro ataques,
timestamps vencido/futuro, limite de tentativas e reutilização de TOTP.

Também verifica concorrência do nonce, repetição após reinício do gateway,
cadastro/sessão/pedido após reinício da loja, logout, mudança de país e ausência
de rotas demo no normal. Respostas de aprovação/bloqueio em claro, tag de resposta
adulterada e resposta autenticada de outro pedido são rejeitadas; o pedido permanece
`ERROR`, nunca confirmado por dados não autenticados. Essa última proteção foi
corrigida após reproduzir a aceitação indevida de um bloqueio em claro.

Na instalação extraída, a abertura direta de `/login` falhou porque o caminho
absoluto de `sendFile` continha uma pasta oculta. O fallback passou a servir
`index.html` com raiz limitada a `dist`, mantendo a proteção de arquivos ocultos.
O teste do launcher verifica HTML/asset e o fluxo após essa correção.

Os bancos/cofres da suíte ficam em `.data/test-*`, separados dos dados existentes.
Senhas, seeds TOTP e cookies não são gravados na evidência pública. A localização
falsa retorna HTTP 200 porque a declaração é ignorada e a consulta confiável é
exibida; não significa aceitação da localização falsificada.

## Exemplos e instalação

`examples:java` recompilou e executou os **13 exemplos originais**, sem modificar
os anexos. [evidencias-java.json](evidencias-java.json) preserva stdout/stderr;
semente/QR do exemplo TOTP foram removidos. AES-GCM produz a exceção esperada após
adulteração, tratada pelo próprio exemplo com exit 0.

A seção `cleanInstallation` da evidência de verificação registra a extração
isolada do pacote: instalação com lockfile, preparação da BIN dos anexos,
setup de cofres novos, build, inicialização, fluxo HTTP e repetição da suíte.
Dependências obtidas do cache local são identificadas; o cache é fonte de
pacotes, não de bancos, cofres ou usuários. A DB5 não faz parte do ZIP.
Não houve uso dos segredos ou bancos da instalação original nessa conferência.

A extração corrigida passou em instalação, typecheck, build e **37 checks**.
O setup foi executado interativamente pelo caminho relativo do README, criando
cofres novos e distintos. `pnpm demo` passou em **11 verificações HTTP** de health,
HTML/asset, cadastro/QR, TOTP, DB5, compra, ataques e novo login. O Chrome renderizou
o formulário de `/login`; `pnpm dev:demo` iniciou os dois Express e o Vite, com
health via proxy e módulo frontend respondendo 200. Os serviços de teste foram
encerrados. O código/configuração/lockfile da extração coincidem com o pacote final;
somente documentação/evidência foram atualizadas após a conferência.

## Limites e verificação humana

Os testes foram executados no Windows desta máquina. Instalação limpa significa
diretório e dados novos, não validação em outro computador ou download inicial
sem cache. Não houve pagamento bancário, deploy, benchmark ou auditoria externa.

Asserções HTTP calculam TOTP de contas sintéticas e verificam QR PNG e vetores
conhecidos. A leitura física do QR pelo celular, revisão pessoal do código e
ensaio coletivo devem ser feitos pelos integrantes. Registrem esses fatos e a
identificação da equipe no relatório antes de enviar ao Moodle.
