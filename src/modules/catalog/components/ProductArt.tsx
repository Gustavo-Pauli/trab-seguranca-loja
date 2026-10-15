export default function ProductArt({ kind }: { kind: string }) {
  const backgrounds: Record<string, string> = {
    notebook: 'bg-[#f3f0e9] text-[#71665a]',
    mug: 'bg-[#edf1ee] text-[#657469]',
    bag: 'bg-[#f6f2e9] text-[#8a7a62]',
    bottle: 'bg-[#edf0f4] text-[#657589]',
  };

  return (
    <div
      className={`grid h-[184px] place-items-center max-tablet:h-[158px]
        ${backgrounds[kind] ?? backgrounds.notebook}`}
    >
      <svg
        className="h-[168px] w-full max-w-[250px] max-tablet:h-[150px]"
        viewBox="0 0 240 170"
        fill="none"
        aria-hidden="true"
      >
        <ellipse cx="120" cy="143" rx="52" ry="6" fill="currentColor" opacity=".08" />
        {kind === 'notebook' && (
          <g stroke="currentColor" strokeWidth="1.6">
            <rect x="80" y="29" width="83" height="111" rx="4" fill="#e5dac8" />
            <path d="M90 29v111M84 38h9M84 50h9M84 62h9M84 74h9M84 86h9M84 98h9M84 110h9M84 122h9" />
            <path d="M114 64h26M114 71h18" opacity=".5" />
            <path d="M164 37v98" />
          </g>
        )}
        {kind === 'mug' && (
          <g stroke="currentColor" strokeWidth="1.7">
            <path d="M145 65h13c25 0 23 44-2 44h-11" />
            <path d="M84 57h65v67c0 19-65 19-65 0V57Z" fill="#e3e9e3" />
            <ellipse cx="116.5" cy="57" rx="32.5" ry="8" fill="#cad3ca" />
            <path d="M92 76v43" opacity=".4" />
          </g>
        )}
        {kind === 'bag' && (
          <g stroke="currentColor" strokeWidth="1.6">
            <path d="m80 63-5 76h91l-5-76Z" fill="#eee4d4" />
            <path d="M100 74V46c0-28 40-28 40 0v28M105 73V46c0-21 30-21 30 0v27" />
            <path d="m84 74-3 57h77l-3-57M110 99h22" opacity=".3" />
          </g>
        )}
        {kind === 'bottle' && (
          <g stroke="currentColor" strokeWidth="1.6">
            <rect x="102" y="24" width="36" height="18" rx="4" fill="#959eaa" />
            <path d="M103 42h34l7 19v72c0 11-48 11-48 0V61l7-19Z" fill="#cbd4df" />
            <path d="M98 63h44M103 72v55M108 30h24" opacity=".5" />
          </g>
        )}
      </svg>
    </div>
  );
}
