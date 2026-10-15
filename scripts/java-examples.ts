import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';

const index = process.argv.indexOf('--attachments');
const root = resolve(
  index < 0 ? join(homedir(), 'Downloads/trabalho-seguranca-anexos') : process.argv[index + 1],
);
const examples = join(root, 'exemplosFIPS2');
const deps = resolve('.data/java-deps');
const output = resolve('.data/java-examples');

mkdirSync(deps, { recursive: true });
mkdirSync(output, { recursive: true });

const artifacts = [
  'com/ip2location/ip2location-java/8.13.0/ip2location-java-8.13.0.jar',
  'de/taimos/totp/1.0/totp-1.0.jar',
  'com/google/zxing/core/3.2.1/core-3.2.1.jar',
  'com/google/zxing/javase/3.2.1/javase-3.2.1.jar',
];

for (const artifact of artifacts) {
  const target = join(deps, artifact.split('/').at(-1)!);
  if (existsSync(target)) {
    continue;
  }
  if (!process.argv.includes('--download')) {
    throw new Error(`Dependência ausente: ${target}. Use --download uma vez com internet.`);
  }
  const response = await fetch(`https://repo.maven.apache.org/maven2/${artifact}`);
  if (!response.ok) {
    throw new Error(`Download falhou: HTTP ${response.status} ${artifact}`);
  }
  writeFileSync(target, Buffer.from(await response.arrayBuffer()));
}

const jars = ['bc-fips-1.0.2.jar', 'bcprov-jdk15on-169.jar', 'commons-codec-1.10.jar'].map((jar) =>
  join(examples, 'fips', jar),
);
const jobs = [
  [
    'HMAC',
    'hmacex.HmacexBCFIPS',
    'Exemplo4-TesteHMAC_UsandoBouncyCastle/src/hmacex/HmacexBCFIPS.java',
    'Exemplo4-TesteHMAC_UsandoBouncyCastle/src/hmacex/Utils.java',
  ],
  [
    'Tampering sem MAC',
    'TamperedExample',
    'Exemplo5-testeModificaMensagem/src/TamperedExample.java',
    'Exemplo5-testeModificaMensagem/src/Utils.java',
  ],
  [
    'Digest preservado',
    'TamperedWithDigestExample',
    'Exemplo6-testeModificaMsgEpermaneceHash/src/TamperedWithDigestExample.java',
    'Exemplo6-testeModificaMsgEpermaneceHash/src/Utils.java',
  ],
  [
    'Digest substituido',
    'TamperedDigestExample',
    'Exemplo7-testeModificaMsgETrocaHash/src/TamperedDigestExample.java',
    'Exemplo7-testeModificaMsgETrocaHash/src/Utils.java',
  ],
  [
    'Tampering com HMAC',
    'TamperedWithHMacExample',
    'Exemplo8-testeModificaMsgMasTemHmac/src/TamperedWithHMacExample.java',
    'Exemplo8-testeModificaMsgMasTemHmac/src/Utils.java',
  ],
  [
    'AES GCM',
    'AESTesteGCMFIPS',
    'Exemplo9-AES-CriptoAutenticada-FIPS/src/AESTesteGCMFIPS.java',
    'Exemplo9-AES-CriptoAutenticada-FIPS/src/Utils.java',
  ],
  ['PBKDF2', 'PBKDF2UtilBCFIPS', 'Exemplo10-testePBKDF2/src/PBKDF2UtilBCFIPS.java'],
  [
    'Scrypt BC',
    'ScryptExample',
    'Exemplo11-TesteSCRYPT-UsandoBC/src/ScryptExample.java',
    'Exemplo11-TesteSCRYPT-UsandoBC/src/SCRYPT.java',
  ],
  [
    'Scrypt FIPS',
    'ScryptExample',
    'Exemplo12-TesteSCRYPT-UsandoBCFIPS/src/ScryptExample.java',
    'Exemplo12-TesteSCRYPT-UsandoBCFIPS/src/SCRYPT.java',
  ],
  [
    'GCM AAD',
    'chapters.GCMWithAADExample',
    'DavidProj/src/chapters/GCMWithAADExample.java',
    'DavidProj/src/chapters/AEADUtils.java',
  ],
  [
    'AES KW',
    'chapters.KWExample',
    'DavidProj/src/chapters/KWExample.java',
    'DavidProj/src/chapters/AEADUtils.java',
  ],
  ['TOTP', 'maven2fa.Example2fa', '2fa/maven-2fa/src/main/java/maven2fa/Example2fa.java'],
  ['IP2Location', 'iplocation.ContextoIP', '@ip'],
];
const results: unknown[] = [];

for (let i = 0; i < jobs.length; i++) {
  const [name, main, ...sources] = jobs[i];
  // BC padrão e BCFIPS possuem classes com o mesmo nome: nunca carregar os dois juntos.
  const classpath = [
    ...jars.filter((path) =>
      name === 'Scrypt BC'
        ? !path.endsWith('bc-fips-1.0.2.jar')
        : !path.endsWith('bcprov-jdk15on-169.jar'),
    ),
    ...artifacts.map((artifact) => join(deps, artifact.split('/').at(-1)!)),
  ].join(';');
  const directory = join(output, String(i));
  mkdirSync(directory, { recursive: true });
  const paths = sources.map((path) =>
    path === '@ip'
      ? join(root, 'ip2location/ip2location/src/main/java/iplocation/ContextoIP.java')
      : join(examples, path),
  );
  const compile = spawnSync(
    'javac',
    ['-encoding', 'UTF-8', '-cp', classpath, '-d', directory, ...paths],
    { encoding: 'utf8', windowsHide: true },
  );
  if (compile.status !== 0) {
    results.push({ name, compiled: false, error: compile.stderr ?? compile.error?.message });
    console.log(`FALHA compilação: ${name}`);
    continue;
  }
  // O exemplo usa caminho relativo da DB5; link/cópia só dentro de .data, sem alterar os anexos.
  if (name === 'IP2Location') {
    writeFileSync(
      join(directory, 'IP2LOCATION-LITE-DB5.BIN'),
      readFileSync(join(root, 'ip2location/ip2location/IP2LOCATION-LITE-DB5.BIN')),
    );
  }
  const run = await new Promise<{ exit: number | null; stdout: string; stderr: string }>(
    (resolveRun) => {
      const child = spawn(
        'java',
        [
          '-Dfile.encoding=UTF-8',
          '-Dstdout.encoding=UTF-8',
          '-Dstderr.encoding=UTF-8',
          '-cp',
          `${directory};${classpath}`,
          main,
        ],
        { cwd: directory, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true },
      );
      let stdout = '';
      let stderr = '';
      let submitted = false;
      let hmacStage = 0;
      const timeout = setTimeout(() => child.kill(), 20_000);
      child.stdout.on('data', (data) => {
        stdout += String(data);
        if (name === 'HMAC') {
          if (hmacStage === 0 && stdout.includes('Digite a msg')) {
            child.stdin.write('mensagem-de-teste\n');
            hmacStage = 1;
          }
          if (hmacStage === 1 && stdout.includes('Digite Mensagem 1')) {
            child.stdin.write('mensagens-iguais\n');
            hmacStage = 2;
          }
          if (hmacStage === 2 && stdout.includes('Digite Mensagem 2')) {
            child.stdin.end('mensagens-iguais\n');
            hmacStage = 3;
          }
        }
        if (name === 'TOTP' && !submitted && stdout.includes('Entre o c')) {
          const code = stdout.match(/TOTP Code = (\d{6})/)?.[1];
          if (code) {
            child.stdin.end(`${code}\n`);
            submitted = true;
          }
        }
      });
      child.stderr.on('data', (data) => {
        stderr += String(data);
      });
      if (name !== 'TOTP' && name !== 'HMAC') {
        child.stdin.end('senha-do-exemplo\n');
      }
      child.on('error', (error) => {
        stderr += error.message;
      });
      child.once('exit', (exit) => {
        clearTimeout(timeout);
        resolveRun({ exit, stdout, stderr });
      });
    },
  );
  // Segredo e QR de teste ficam somente em .data; evidência pública remove esse material.
  const sanitized =
    name === 'TOTP'
      ? run.stdout
          .split('\n')
          .filter((line) => !/Chave =|TOTP Code =|Bar Code URL =/.test(line))
          .join('\n')
      : run.stdout;
  results.push({ name, compiled: true, exit: run.exit, stdout: sanitized, stderr: run.stderr });
  console.log(
    `EXECUTADO ${name}: exit=${run.exit}${run.stderr ? ' (ver stderr na evidência)' : ''}`,
  );
}

writeFileSync(
  'docs/evidencias-java.json',
  JSON.stringify(
    {
      executedAt: new Date().toISOString(),
      java: spawnSync('java', ['-version'], { encoding: 'utf8' }).stderr,
      sourcesUnmodified: true,
      results,
    },
    null,
    2,
  ),
);
console.log(
  'Resultados reais em docs/evidencias-java.json. ' +
    'Exceções esperadas e impedimentos devem ser interpretados pelo relatório.',
);
