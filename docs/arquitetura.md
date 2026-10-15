# Mapa dos módulos

Este mapa localiza o código; decisões de segurança estão no relatório e o
encadeamento das funções está em [COMO_FUNCIONA.md](COMO_FUNCIONA.md).

| Pasta/arquivo | Responsabilidade |
|---|---|
| `src/app/app.tsx`, `layout.tsx`, `routes/` | URLs, layout e encaminhamento entre páginas. |
| `src/components/Page.tsx` | Estrutura visual comum das páginas da loja. |
| `src/modules/auth/` | Formulários de senha/cadastro/TOTP, chamadas HTTP e estado da sessão. |
| `src/modules/auth/components/AuthPanel.tsx` | Estrutura comum de login, cadastro e segundo fator. |
| `src/modules/catalog/` | Catálogo, tipos e cartões de produto. |
| `src/modules/cart/` | Seleção entre páginas, quantidades e checkout. |
| `src/modules/orders/` | Chamadas e apresentação do histórico. |
| `src/modules/security-demo/` | Quatro testes, formulário TOTP incorreto e resultados. |
| `src/lib/api.ts` | Transporte JSON do frontend. |
| `src/styles/tailwind.css` | Tailwind, tipografia, controles comuns e breakpoints; layouts no JSX. |
| `server/index.ts`, `app.ts`, `lib/` | Cofre/startup, Express, proteção HTTP, erros e SQLite da loja. |
| `server/modules/auth/` | Rotas, cadastro/senha, segundo fator, desafios, sessões, Scrypt/TOTP e SQL. |
| `server/modules/context/` | IP da conexão e referência contextual persistida da conta. |
| `server/modules/catalog/` | Endpoint autenticado do catálogo. |
| `server/modules/orders/` | Regra de compra e persistência PENDING/APPROVED/BLOCKED/ERROR. |
| `server/modules/payments/` | Mensagem, envio e verificação da resposta do gateway. |
| `server/modules/security-demo/` | Captura por conta, replay e adulteração no modo demo. |
| `gateway/index.ts`, `app.ts`, `lib/` | Cofre/startup, Express e banco próprio. |
| `gateway/modules/payments/` | Autenticação da entrada, validações e resposta cifrada. |
| `gateway/modules/replay/` | Consumo atômico/persistente do nonce e pagamento. |
| `shared/protocol/` | Contratos, PBKDF2, AES-GCM, Base64 e arquivos cifrados. |
| `shared/context/`, `shared/catalog.ts` | Consulta/política e preços comuns, sem duplicar regras. |
| `scripts/` | Setup, launcher, testes, exemplos Java e empacotamento. |

`*.routes.ts` recebe HTTP; `*.service.ts` implementa regras; `*.repository.ts`
contém SQL. Compartilhar fontes não compartilha segredos, conexão SQLite ou memória
entre processos. Os guards do React organizam páginas; a autorização real está no Express.

URLs: `/login`, `/register`, `/totp`, `/store`, `/checkout`, `/orders`, `/security`.
O carrinho fica em memória; sessão, usuários, pedidos, contexto e nonces persistem.
As APIs normais mantêm `/api/auth/*`, `/api/products`, `/api/orders`,
`/api/checkout` e `/api/context`. `/api/demo/*` só é montada no demo;
`/payments` pertence ao gateway.

O plugin `@tailwindcss/vite` gera o CSS durante o desenvolvimento/build.
`src/styles/tailwind.css` importa Tailwind e define controles repetidos com `@apply`.
Layouts e estados visuais ficam nas classes do JSX; mapas de cores usam classes completas
para que o compilador as encontre. Os breakpoints `phone`, `tablet` e `desktop`
preservam as mudanças de layout em 420, 720 e 950 px.
