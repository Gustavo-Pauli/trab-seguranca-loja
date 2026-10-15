import type { ReactNode } from 'react';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main
      className="flex min-h-[calc(100svh-72px)] items-center justify-center px-5 py-12
        max-tablet:min-h-[calc(100svh-64px)] max-tablet:py-8"
    >
      {children}
    </main>
  );
}

type Props = {
  label: string;
  title: string;
  children: ReactNode;
};

export default function AuthPanel({ label, title, children }: Props) {
  return (
    <AuthShell>
      <section
        className="w-[390px] max-w-full rounded-xl border border-zinc-200 bg-white p-8
          shadow-[0_2px_4px_#18181b03] max-tablet:p-[27px]"
        aria-label={label}
      >
        <h1 className="text-[22px]">{title}</h1>
        {children}
      </section>
    </AuthShell>
  );
}
