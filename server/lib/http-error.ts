/** Erros esperados das regras viram respostas curtas; detalhes internos não saem da API. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public reason?: string,
  ) {
    super(message);
  }
}
