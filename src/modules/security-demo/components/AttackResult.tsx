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
    <section
      className="rounded-[9px] border border-zinc-200 bg-white p-[22px] text-sm leading-[1.8]"
      aria-label="Resultado do teste"
      role="status"
    >
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
      <details className="mt-6 text-[13px] text-zinc-600">
        <summary>Requisição e resposta completas</summary>
        <pre className="mt-6 max-h-[550px] overflow-auto rounded-lg border border-zinc-200 bg-white p-5 text-xs">
          {JSON.stringify(evidence, null, 2)}
        </pre>
      </details>
    </section>
  );
}
