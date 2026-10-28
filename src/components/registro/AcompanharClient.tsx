"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { tokenDoFragmento } from "./fluxo";

type Atualizacao = { id: string | number; tipo: string; situacao_nova: string | null; texto: string; evidencia: string | null; criado_em: string };
type Resposta = { id: string | number; autor_vinculo: string; texto: string; criado_em: string };
type Relato = { protocolo: string; titulo: string; situacao: string; moderacao: string; motivo_remocao: string | null; publicado_em: string | null; criado_em: string; atualizacoes: Atualizacao[]; respostas: Resposta[] };
const MENSAGEM_NEUTRA = "Não foi possível acessar um acompanhamento com este link. Confira o link privado que você guardou.";
const observarFragmento = (avisar: () => void) => { window.addEventListener("hashchange", avisar); return () => window.removeEventListener("hashchange", avisar); };
const lerFragmento = () => tokenDoFragmento(window.location.hash);
const SITUACOES: Record<string, string> = {
  recebido: "Recebido", em_analise: "Em análise", encaminhado_ao_orgao: "Encaminhado ao órgão",
  aguardando_resposta_do_orgao: "Aguardando resposta do órgão", sendo_resolvido: "Sendo resolvido",
  resolvido: "Resolvido", encerrado_sem_solucao: "Encerrado sem solução",
};

function dataLegivel(valor: string): string {
  const data = new Date(valor);
  return Number.isNaN(data.valueOf()) ? "Data indisponível" : new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(data);
}

export function AcompanharClient() {
  const token = useSyncExternalStore(observarFragmento, lerFragmento, () => null);
  const [relato, setRelato] = useState<Relato | null>(null);
  const [estado, setEstado] = useState<"carregando" | "pronto" | "erro" | "confirmando" | "excluindo" | "excluido">("carregando");
  const [erro, setErro] = useState("");
  const [confirmacao, setConfirmacao] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const tituloConfirmacao = useRef<HTMLHeadingElement>(null);

  const consultar = useCallback(async (segredo: string) => {
    setEstado("carregando"); setErro("");
    try {
      const resposta = await fetch("/api/acompanhar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: segredo }), cache: "no-store" });
      const dados: unknown = await resposta.json().catch(() => null);
      if (!resposta.ok || !dados || typeof dados !== "object" || typeof (dados as Record<string, unknown>).protocolo !== "string") {
        const codigo = dados && typeof dados === "object" ? ((dados as { erro?: { codigo?: string } }).erro?.codigo) : undefined;
        if (codigo === "indisponivel" || resposta.status === 503 || resposta.status === 429) throw new Error("temporario");
        throw new Error("neutro");
      }
      setRelato(dados as Relato); setEstado("pronto"); requestAnimationFrame(() => titulo.current?.focus());
    } catch (falha) {
      setRelato(null); setErro(falha instanceof Error && falha.message === "temporario" ? "Não foi possível carregar agora. Tente novamente." : MENSAGEM_NEUTRA); setEstado("erro"); requestAnimationFrame(() => titulo.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (token) queueMicrotask(() => { void consultar(token); });
  }, [consultar, token]);

  useEffect(() => {
    if (confirmacao) requestAnimationFrame(() => tituloConfirmacao.current?.focus());
  }, [confirmacao]);

  async function excluir() {
    if (!token) return;
    setEstado("excluindo"); setErro("");
    try {
      const resposta = await fetch("/api/excluir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, confirmacao: true }), cache: "no-store" });
      const dados: unknown = await resposta.json().catch(() => null);
      if (!resposta.ok || !dados || typeof dados !== "object" || (dados as { confirmacao?: unknown }).confirmacao !== "Exclusão concluída.") throw new Error();
      setRelato(null); setConfirmacao(false); setEstado("excluido");
      window.history.replaceState(null, "", "/acompanhar");
      requestAnimationFrame(() => titulo.current?.focus());
    } catch {
      setErro("Não foi possível concluir agora. Tente novamente."); setEstado("pronto"); setConfirmacao(false);
    }
  }

  return <section aria-live="polite" className="space-y-5">
    {!token && estado !== "excluido" && <div className="rounded-cartao border border-borda bg-neutro-fundo p-5"><h2 ref={titulo} tabIndex={-1}>Acompanhamento</h2><p className="mt-2">{MENSAGEM_NEUTRA}</p></div>}
    {token && estado === "carregando" && <p role="status">Carregando acompanhamento…</p>}
    {estado === "erro" && <div className="rounded-cartao border border-borda bg-neutro-fundo p-5"><h2 ref={titulo} tabIndex={-1}>Acompanhamento</h2><p className="mt-2">{erro}</p>{token && <button className="mt-4 min-h-12 rounded-controle border border-borda px-4 font-semibold" onClick={() => void consultar(token)}>Tentar novamente</button>}</div>}
    {estado === "excluido" && <div className="rounded-cartao border border-borda bg-sucesso-fundo p-5"><h2 ref={titulo} tabIndex={-1}>Exclusão concluída</h2><p className="mt-2">O texto do relato foi retirado da exibição. O registro de auditoria permanece.</p></div>}
    {(estado === "pronto" || estado === "confirmando" || estado === "excluindo") && relato && <>
      {erro && <p role="alert" className="rounded-controle border border-erro bg-erro-fundo p-4 text-erro">{erro}</p>}
      <div className="rounded-cartao border border-borda bg-superficie p-5">
        <p className="text-sm font-semibold text-texto-suave">Acompanhamento privado · Protocolo {relato.protocolo}</p>
        <h2 ref={titulo} tabIndex={-1} className="mt-2">{relato.titulo}</h2>
        <p className="mt-3"><strong>Situação:</strong> {SITUACOES[relato.situacao] ?? relato.situacao}</p>
        <p className="mt-2 text-sm text-texto-suave">Enviado em {dataLegivel(relato.criado_em)}{relato.publicado_em ? ` · Publicado em ${dataLegivel(relato.publicado_em)}` : ""}</p>
        {relato.moderacao === "pendente" && <p className="mt-3 rounded-controle bg-info-fundo p-3">O relato está em análise antes da publicação.</p>}
        {relato.moderacao === "retido" && <p className="mt-3 rounded-controle bg-aviso-fundo p-3">O relato está retido para análise.</p>}
        {relato.moderacao === "removido" && <p className="mt-3 rounded-controle bg-neutro-fundo p-3">Este relato foi retirado da exibição.</p>}
        {relato.motivo_remocao && <p className="mt-2 text-sm">{relato.motivo_remocao}</p>}
      </div>
      <section aria-labelledby="historico-titulo" className="rounded-cartao border border-borda bg-superficie p-5">
        <h3 id="historico-titulo">Atualizações</h3>
        {relato.atualizacoes.length ? <ol className="mt-4 space-y-4 border-l-2 border-acao pl-4">{relato.atualizacoes.map((item) => <li key={item.id} className="relative"><p className="font-semibold">{item.situacao_nova ? SITUACOES[item.situacao_nova] ?? item.situacao_nova : item.tipo.replaceAll("_", " ")}</p><p className="mt-1">{item.texto}</p>{item.evidencia && <p className="mt-1 text-sm">{item.evidencia}</p>}<time className="mt-1 block text-sm text-texto-suave" dateTime={item.criado_em}>{dataLegivel(item.criado_em)}</time></li>)}</ol> : <p className="mt-3">Ainda não há atualizações disponíveis.</p>}
      </section>
      <section aria-labelledby="respostas-titulo" className="rounded-cartao border border-borda bg-superficie p-5">
        <h3 id="respostas-titulo">Respostas publicadas</h3>
        {relato.respostas.length ? <ul className="mt-4 space-y-4">{relato.respostas.map((item) => <li key={item.id} className="border-t border-borda-suave pt-3"><p className="font-semibold">{item.autor_vinculo}</p><p className="mt-1">{item.texto}</p><time className="mt-1 block text-sm text-texto-suave" dateTime={item.criado_em}>{dataLegivel(item.criado_em)}</time></li>)}</ul> : <p className="mt-3">Ainda não há respostas publicadas.</p>}
      </section>
      {!confirmacao && <button disabled={estado === "excluindo"} className="min-h-12 rounded-controle border border-erro px-4 font-semibold text-erro disabled:opacity-60" onClick={() => { setConfirmacao(true); setEstado("confirmando"); }}>Pedir exclusão do relato</button>}
      {confirmacao && <section aria-labelledby="confirmar-exclusao" className="rounded-cartao border border-erro bg-erro-fundo p-5">
        <h3 id="confirmar-exclusao" ref={tituloConfirmacao} tabIndex={-1}>Confirmar exclusão</h3>
        <p className="mt-2">O texto será retirado da exibição e substituído por um marcador. O registro de auditoria permanece. Esta ação não pode ser desfeita por este link.</p>
        {estado === "excluindo" ? <p role="status" className="mt-3">Concluindo exclusão…</p> : <div className="mt-4 flex flex-col gap-3 sm:flex-row"><button className="min-h-12 rounded-controle bg-erro px-4 font-semibold text-white" onClick={() => void excluir()}>Confirmar exclusão</button><button className="min-h-12 rounded-controle border border-borda px-4 font-semibold" onClick={() => { setConfirmacao(false); setEstado("pronto"); }}>Cancelar</button></div>}
      </section>}
    </>}
  </section>;
}
