import type { Evidence } from '../types';

type Result = {
  status?: string;
  reason?: string;
  error?: string;
  observed?: { ip: string; country: string | null; city: string | null; source: string };
  clientDeclarationIgnored?: boolean;
  response?: { httpStatus: number; result: Result };
};

export default function AttackResult({ evidence }: { evidence: Evidence }) {
  const outer = evidence.result as Result;
  const result = outer.response?.result ?? outer;
  const status = outer.response?.httpStatus ?? evidence.httpStatus;

  return (
    <section className="attack-result" aria-label="Resultado do teste" role="status">
      <p>
        <strong>HTTP {status}</strong>
        {result.status && ` · ${result.status}`}
      </p>
      {result.reason && <p>{result.reason}</p>}
      {result.error && <p>{result.error}</p>}
      {result.observed && (
        <>
          <p>
            IP consultado: {result.observed.ip} ({result.observed.source})
          </p>
          <p>
            {result.observed.country ?? 'País indisponível'} ·{' '}
            {result.observed.city ?? 'Cidade indisponível'}
          </p>
          <p>Declaração do cliente ignorada: {String(result.clientDeclarationIgnored)}</p>
        </>
      )}
      <details className="wire-details">
        <summary>Requisição e resposta completas</summary>
        <pre>{JSON.stringify(evidence, null, 2)}</pre>
      </details>
    </section>
  );
}
