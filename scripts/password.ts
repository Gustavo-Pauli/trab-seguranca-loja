export async function passwordPrompt(label: string): Promise<Buffer> {
  if (!process.stdin.isTTY) {
    throw new Error('Abra um terminal interativo para informar a senha.');
  }

  process.stdout.write(label);
  // Lê as teclas sem exibir a senha; finish() restaura o terminal ao concluir ou cancelar.
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  return new Promise((resolve, reject) => {
    let value = '';
    const finish = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off('data', onData);
      process.stdout.write('\n');
    };
    function onData(chunk: string) {
      for (const char of chunk) {
        if (char === '\u0003') {
          finish();
          reject(new Error('Operação cancelada.'));

          return;
        }

        if (char === '\r' || char === '\n') {
          finish();

          const result = Buffer.from(value);
          value = '';
          resolve(result);

          return;
        }

        if (char === '\u007f' || char === '\b') {
          value = value.slice(0, -1);
        } else if (char >= ' ' && value.length < 256) {
          value += char;
        }
      }
    }
    process.stdin.on('data', onData);
  });
}
