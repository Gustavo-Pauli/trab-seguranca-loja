export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

// Os testes precisam ler também o corpo das respostas 4xx/5xx.
export async function request<T>(path: string, body?: unknown) {
  const options: RequestInit = { credentials: 'same-origin' };

  if (body !== undefined) {
    options.method = 'POST';
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`/api${path}`, options);
  const data: T = await response.json().catch(() => {
    throw new Error('Não foi possível conectar à loja.');
  });

  return { httpStatus: response.status, ok: response.ok, data };
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await request<T>(path, body);

  if (!response.ok) {
    const payload = response.data as { error?: string };
    const error = payload.error ?? 'Não foi possível concluir a operação.';
    throw new ApiError(error, response.httpStatus);
  }

  return response.data;
}

export function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Tente novamente.';
}

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
