// Lê o Base64 e confere o tamanho em bytes quando ele é informado.
export function decode(value: unknown, length?: number): Buffer {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new Error('INVALID_ENVELOPE');
  }

  const bytes = Buffer.from(value, 'base64');

  if (bytes.toString('base64') !== value || (length !== undefined && bytes.length !== length)) {
    throw new Error('INVALID_ENVELOPE');
  }

  return bytes;
}
