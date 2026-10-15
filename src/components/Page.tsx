import type { ReactNode } from 'react';

export default function Page({ children }: { children: ReactNode }) {
  return (
    <main
      className="mx-auto max-w-[1168px] px-8 pt-10 pb-16
        max-tablet:px-5 max-tablet:pt-7 max-tablet:pb-10"
    >
      {children}
    </main>
  );
}
