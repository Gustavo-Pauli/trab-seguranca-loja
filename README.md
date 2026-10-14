# Loja Segura — INE5680 / UFSC

Loja acadêmica com React/Vite, API Express e gateway Express independente.
Pagamentos simulados; SQLite, Scrypt/TOTP, IP2Location DB5 e AES-GCM.

## 1. Pré-requisitos

- Node.js 22.14 ou posterior e pnpm 10.
- Base `IP2LOCATION-LITE-DB5.BIN` dos anexos da disciplina.
- Aplicativo autenticador TOTP com relógio sincronizado.
- Internet na primeira instalação. JDK só é necessário para executar os exemplos Java.

Os comandos abaixo usam PowerShell. `pnpm.cmd` evita o bloqueio de `pnpm.ps1`.
Execute-os na pasta extraída do projeto, que contém `package.json`.

## 2. Instalar dependências

```powershell
pnpm.cmd install --frozen-lockfile
```

O projeto autoriza somente os builds nativos de `better-sqlite3` e `esbuild`.
Se aparecer “Could not locate the bindings file”, execute
`pnpm.cmd rebuild better-sqlite3 esbuild` e confira `pnpm.cmd ignored-builds`.

## 3. Preparar a base IP2Location

Extraia os anexos em uma pasta irmã do projeto chamada `trabalho-seguranca-anexos`:

```text
pasta-de-trabalho/
  loja-segura/                  projeto extraído, com package.json
  trabalho-seguranca-anexos/
    ip2location/ip2location/IP2LOCATION-LITE-DB5.BIN
    exemplosFIPS2/
```

O ZIP não redistribui a BIN. Os termos consultados contêm restrição de
redistribuição do produto; utilize o arquivo disponibilizado pela professora.
Veja a origem e a atribuição em [data/README.md](data/README.md).

## 4. Inicializar os cofres

```powershell
pnpm.cmd run setup --bin "../trabalho-seguranca-anexos/ip2location/ip2location/IP2LOCATION-LITE-DB5.BIN"
```

O setup copia a base para `data/` se ainda não existir e pede/confirma uma senha
de desbloqueio, sem eco, com pelo menos 12 caracteres. **Guarde essa senha.**
Ele cria dois cofres cifrados com o mesmo segredo aleatório inicial e salts
independentes; não existem chaves/IVs fixos. Cada processo abre seu próprio cofre.
Para repetir o setup com a DB5 já copiada, use `pnpm.cmd run setup`.
`pnpm setup` sem `run` é um comando diferente do pnpm.

Reexecutar confere os cofres existentes sem reinicializá-los. Preserve `.data/`:
ela contém cofres, usuários, sessões, pedidos e nonces. Não há recuperação da
senha de desbloqueio nem redefinição de senha da conta nesta aplicação.

## 5. Iniciar loja e gateway

```powershell
pnpm.cmd build
pnpm.cmd demo
```

Informe a senha dos cofres. O launcher inicia **dois processos Express**, loja
em 3001 e gateway em 4000. Express serve a build e a API na mesma origem.
Ctrl+C encerra a execução; pare a instância anterior antes de iniciar outra.

| Comando | Ambiente |
|---|---|
| `pnpm.cmd demo` | Build com testes e IP de cenário definido no servidor. |
| `pnpm.cmd start` | Build normal, sem endpoints de ataque. |
| `pnpm.cmd dev:demo` | Desenvolvimento com Vite em 5173 e modo demo. |
| `pnpm.cmd dev` | Desenvolvimento normal com Vite em 5173. |

No **demo**, a DB5 é consultada para `150.162.60.21`, configurado no servidor.
Esse endereço não é o IP detectado do navegador. No **normal**, o IP vem do
socket Express; JSON, query e `X-Forwarded-For` não o substituem. Loopback tem
país/cidade nulos. O proxy Vite não comprova a origem real do navegador.
Uma conta com referência pública não é rebaixada automaticamente para loopback.

## 6. Acessar

Abra **http://127.0.0.1:3001** na build, ou **http://127.0.0.1:5173** no dev.
Todos os serviços escutam em loopback; a execução é local e HTTP.

Cadastre-se, escaneie o QR e confirme o TOTP. Para mostrar o login, saia e entre
com senha e um novo código. Um TOTP aceito não pode ser reutilizado. Na Loja,
adicione produtos; no Carrinho, altere quantidades e finalize; consulte Pedidos.
O carrinho é mantido entre páginas, mas é limpo ao sair/recarregar; pedidos persistem.

## 7. Demonstrar ataques

No modo demo, compre **dois cadernos (R$100)** e abra **Testes**:

1. **Replay:** reenvia a mensagem capturada; gateway bloqueia por nonce usado.
2. **Alterar valor:** tenta R$100 → R$1000 sem recalcular a tag; GCM rejeita.
3. **TOTP inválido:** informe senha correta e código incorreto de seis dígitos.
4. **Localização falsa:** envia declaração falsa; o servidor mostra a consulta confiável.

Faça replay em até dois minutos. Depois, `INVALID_TIMESTAMP` é um bloqueio
correto; faça outra compra para demonstrar especificamente o nonce. Detalhes
dos envelopes ficam expansíveis. O teste TOTP não cria uma nova sessão quando
rejeitado, mas não revoga uma sessão anterior já autenticada.

Para mostrar mudança de país, encerre e use `pnpm.cmd demo --ip 8.8.8.8`.
A conta cuja referência foi BR será bloqueada por `COUNTRY_CHANGED` no login,
mesmo com TOTP válido. Encerre e retorne ao demo padrão depois.

## 8. Verificar e empacotar

```powershell
pnpm.cmd typecheck
pnpm.cmd build
pnpm.cmd test:security
pnpm.cmd zip
```

A suíte executa 37 verificações em 3301/4400, com bancos/cofres novos em
`.data/test-*`, e encerra seus processos. Evidência: [docs/evidencias-http.json](docs/evidencias-http.json).
O ZIP fica em `output/`, sem dados privados, cofres, BINs, dependências ou build.

Para os exemplos originais, instale JDK (`java` e `javac`) e mantenha os anexos
na estrutura acima. Prepare as dependências uma vez:

```powershell
pnpm.cmd examples:java --attachments "../trabalho-seguranca-anexos" --download
```

Depois, repita sem `--download`. O executor não altera as fontes e registra
[docs/evidencias-java.json](docs/evidencias-java.json). A exceção do exemplo GCM
após adulteração é esperada. A aplicação não precisa de Java para funcionar.

Estudo: [guia de funções](docs/COMO_FUNCIONA.md) e [mapa dos módulos](docs/arquitetura.md).
Entrega: [relatório](docs/relatorio.md), [roteiro](docs/apresentacao.md) e
[validação final](docs/validacao.md). Preencha identificação e revisão humana no
relatório antes de empacotar para o Moodle; os testes do agente não substituem o ensaio da equipe.
