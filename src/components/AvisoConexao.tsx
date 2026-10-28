"use client";

import { useSyncExternalStore } from "react";
const observar = (avisar: () => void) => {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => { window.removeEventListener("online", avisar); window.removeEventListener("offline", avisar); };
};
export function AvisoConexao() {
  const conectado = useSyncExternalStore(observar, () => navigator.onLine, () => true);
  return conectado ? null : <p role="status" className="rounded-controle border border-borda bg-info-fundo p-4">Você está sem conexão. Mantenha esta página aberta e tente novamente quando a conexão voltar. Os campos desta página serão preservados.</p>;
}
