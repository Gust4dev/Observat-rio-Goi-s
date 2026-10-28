export function AvisoMetodologico() {
  return (
    <aside className="rounded-2xl border border-borda bg-superficie p-4 text-sm text-texto-suave" aria-label="Como ler estes números">
      <p className="flex items-center gap-2 font-semibold text-texto"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7v1" /></svg>Como ler estes números</p>
      <p className="mt-2">Os números mostram relatos publicados e não medem a gravidade dos problemas.</p>
      <p className="mt-1">A contagem de “Também me afeta” não representa a quantidade total de pessoas afetadas.</p>
    </aside>
  );
}
