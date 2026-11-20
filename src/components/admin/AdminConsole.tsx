"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  adminRequest, AdminApiError, avancarPaginaAdmin, cursorPaginaAdmin, primeiraPaginaAdmin,
  resumoAuditoriaAdmin, rotaColecaoAdmin, rotaFilaAdmin, voltarPaginaAdmin,
  type ColecaoAdmin, type FiltrosFilaAdmin, type HistoricoPaginasAdmin,
} from "./admin-api";

type Papel = "moderador" | "gestor" | "superadmin";
type Item = { id?: string | number; user_id?: string; protocolo?: string; titulo?: string; descricao?: string; municipio_nome?: string; categoria_nome?: string; situacao?: string; moderacao?: string; status?: string; texto?: string; papel?: string; ativo?: boolean; acao?: string; ocorrencia_id?: string | null; admin_id?: string | null; criado_em?: string | null; versao_admin?: number; denuncias_abertas?: number; imagens_pendentes?: number; motivo?: string; tipo?: string; evidencia?: string | null; publica?: boolean };
type Pagina = { itens: Item[]; proximo_cursor: string | null };
type ResumoFila = { calculado_em: string; com_denuncias: number; com_fotos_pendentes: number };
type Detalhe = {
  ocorrencia: Item;
  imagens: { id: string; ordem: number; moderacao: string }[];
  resumos: { tem_denuncias: boolean; tem_respostas: boolean; tem_atualizacoes: boolean };
};
const situacoes = ["registrado", "em_analise", "encaminhado", "aguardando_resposta", "em_atendimento", "resolvido", "encerrado_sem_solucao"];
const colecoes = { denuncias: "Denúncias", respostas: "Respostas", atualizacoes: "Atualizações públicas" } as const;
const dataResumo = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

function ListaColecao({ id, colecao, temItens, onError }: { id: string; colecao: ColecaoAdmin; temItens: boolean; onError: (error: unknown) => void }) {
  const [pagina, setPagina] = useState<Pagina | null>(null);
  const [historico, setHistorico] = useState(primeiraPaginaAdmin);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  async function carregar(destino = primeiraPaginaAdmin) {
    setCarregando(true);
    setErro("");
    try {
      const resposta = await adminRequest<Pagina>(rotaColecaoAdmin(id, colecao, cursorPaginaAdmin(destino)));
      setPagina(resposta);
      setHistorico(destino);
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 401) onError(e);
      else setErro(e instanceof Error ? e.message : "Não foi possível consultar esta lista.");
    } finally {
      setCarregando(false);
    }
  }
  return <section className="mt-4 border-t pt-3">
    <h3 className="font-semibold">{colecoes[colecao]}</h3>
    {erro && <p role="alert">{erro}</p>}
    {(pagina ? pagina.itens.length === 0 : !temItens) && <p>Nenhum item encontrado.</p>}
    {pagina?.itens.length ? <ul className="divide-y">{pagina.itens.map(item => <li key={item.id} className="py-2">
      <small>{[item.criado_em, item.status, item.tipo, item.publica === false ? "Privada" : null].filter(Boolean).join(" · ")}</small>
      <p className="whitespace-pre-wrap">{item.texto || item.motivo}</p>
      {item.evidencia && <p className="whitespace-pre-wrap">Evidência: {item.evidencia}</p>}
    </li>)}</ul> : null}
    {pagina && <button type="button" disabled={carregando} className="mr-2 mt-2 rounded border px-2 py-1" onClick={() => void carregar()}>
      Atualizar {colecoes[colecao].toLowerCase()}
    </button>}
    {historico.length > 1 && <button type="button" disabled={carregando} className="mr-2 mt-2 rounded border px-2 py-1" onClick={() => void carregar(voltarPaginaAdmin(historico))}>
      Página anterior
    </button>}
    {pagina?.proximo_cursor && <button type="button" disabled={carregando} className="mt-2 rounded border px-2 py-1" onClick={() => {
      if (pagina.proximo_cursor) void carregar(avancarPaginaAdmin(historico, pagina.proximo_cursor));
    }}>Próxima página</button>}
    {!pagina && <button type="button" disabled={carregando} className="mt-2 rounded border px-2 py-1" onClick={() => void carregar()}>
      {carregando ? "Carregando…" : `Consultar ${colecoes[colecao].toLowerCase()}`}
    </button>}
  </section>;
}

export default function AdminConsole() {
  const [papel, setPapel] = useState<Papel | null>(null);
  const [stage, setStage] = useState<"login" | "totp" | "enroll">("login");
  const [enrollInfo, setEnrollInfo] = useState<{ id: string; totp: { qr_code: string; secret: string; uri: string } } | null>(null);
  const [factor, setFactor] = useState(""); const [challenge, setChallenge] = useState("");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [code, setCode] = useState("");
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [section, setSection] = useState("fila");
  const [selected, setSelected] = useState<Item | null>(null);
  const [rows, setRows] = useState<Item[]>([]); const [busy, setBusy] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosFilaAdmin>({ ordem: "antigos", pendencia: "" });
  const [resumo, setResumo] = useState<ResumoFila | null>(null);
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);
  const [conflito, setConflito] = useState(false);
  const [respostaAcao, setRespostaAcao] = useState<"publicar" | "rejeitar" | "">("");
  const [denunciaStatus, setDenunciaStatus] = useState("");
  const [modAction, setModAction] = useState(""); const [modReason, setModReason] = useState(""); const [modCode, setModCode] = useState("outro");
  const [inviteLink, setInviteLink] = useState("");
  const [cursor, setCursor] = useState<string | null>(null); const [offset, setOffset] = useState(0); const [hasMore, setHasMore] = useState(false);
  const [historico, setHistorico] = useState(primeiraPaginaAdmin);
  const leituraAtual = useRef(0);
  const invalidarLeitura = useCallback(() => { leituraAtual.current++; }, []);
  const setFailure = useCallback((e: unknown) => {
    if (e instanceof AdminApiError && e.status === 401) { setPapel(null); setStage("login"); setSelected(null); setDetalhe(null); setPassword(""); setError("Sua sessão expirou. Entre novamente para continuar."); }
    else setError(e instanceof Error ? e.message : "Não foi possível concluir a operação.");
  }, []);
  const api = useCallback(async <T,>(path: string, body?: unknown): Promise<T> => {
    try { return await adminRequest<T>(path, body); }
    catch (e) { setFailure(e); throw e; }
  }, [setFailure]);
  const run = (action: () => Promise<unknown>) => { void action().catch(setFailure); };
  const loadSession = useCallback(async () => {
    try { const s = await api<{ authenticated: boolean; papel: Papel }>("/api/admin/auth/session"); setPapel(s.papel); setError(""); }
    catch (e) { setPapel(null); if (e instanceof AdminApiError && e.status === 403) setError("Acesso administrativo ainda não confirmado (AAL2)."); else if (e instanceof AdminApiError) setFailure(e); }
  }, [api, setFailure]);
  useEffect(() => { void Promise.resolve().then(loadSession); }, [loadSession]);
  const load = useCallback(async (destino?: HistoricoPaginasAdmin, paginaAuditoria = 0) => {
    if (!papel) return;
    const leitura = ++leituraAtual.current;
    setBusy(true);
    const cursorAlvo = cursorPaginaAdmin(destino ?? primeiraPaginaAdmin);
    if (!destino && paginaAuditoria === 0) {
      setRows([]);
      setCursor(null);
      setHasMore(false);
      setOffset(0);
      setResumo(null);
      setHistorico(primeiraPaginaAdmin);
    }
    try {
      if (section === "fila" || section === "denuncias" || section === "respostas") {
        const path = section === "fila" ? rotaFilaAdmin(filtros, cursorAlvo) :
          `/api/admin/${section}?limite=50${cursorAlvo ? "&cursor=" + encodeURIComponent(cursorAlvo) : ""}`;
        const reqResumo = section === "fila" && !cursorAlvo
          ? adminRequest<ResumoFila>("/api/admin/fila?resumo=true").then(
            value => { if (leitura === leituraAtual.current) setResumo(value); },
            error => { if (leitura === leituraAtual.current) setFailure(error); },
          )
          : null;
        const pagina = await adminRequest<Pagina>(path);
        if (leitura !== leituraAtual.current) return;
        setRows(pagina.itens);
        setCursor(pagina.proximo_cursor);
        setHistorico(destino ?? primeiraPaginaAdmin);
        setHasMore(!!pagina.proximo_cursor);
        await reqResumo;
      } else {
        const path = section === "auditoria" ? "/api/admin/auditoria?limite=50&offset=" + paginaAuditoria : "/api/admin/equipe";
        const itens = await adminRequest<Item[]>(path);
        if (leitura !== leituraAtual.current) return;
        setRows(itens);
        setOffset(paginaAuditoria);
        setHasMore(section === "auditoria" && itens.length === 50);
      }
    } catch (e) {
      if (leitura === leituraAtual.current) setFailure(e);
    } finally {
      if (leitura === leituraAtual.current) setBusy(false);
    }
  }, [papel, section, filtros, setFailure]);
  useEffect(() => {
    let ativa = true;
    void Promise.resolve().then(() => { if (ativa) return load(); });
    return () => { ativa = false; invalidarLeitura(); };
  }, [load, invalidarLeitura]);
  async function submit(event: FormEvent, action: (data: FormData) => Promise<void>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { await action(new FormData(event.currentTarget as HTMLFormElement)); }
    catch (e) { setFailure(e); }
    finally { setBusy(false); }
  }
  async function login(data: FormData) {
    await api("/api/admin/auth/login", { email: data.get("email"), password: data.get("password") }); setPassword("");
    const f = await api<{ factors: { id: string; status: string }[] }>("/api/admin/auth/factors");
    const active = f.factors.find(x => x.status === "verified");
    if (!active) { const enrollment = await api<typeof enrollInfo>("/api/admin/auth/enroll", {}); if (!enrollment) throw new Error("Não foi possível iniciar o MFA."); setEnrollInfo(enrollment); setFactor(enrollment.id); setStage("enroll"); return; }
    setFactor(active.id); const c = await api<{ id: string }>("/api/admin/auth/challenge", { factor_id: active.id }); setChallenge(c.id); setStage("totp");
  }
  async function verify(data: FormData) {
    if (stage === "enroll") { const c = await api<{ id: string }>("/api/admin/auth/challenge", { factor_id: factor }); setChallenge(c.id); setStage("totp"); }
    else await api("/api/admin/auth/verify", { factor_id: factor, challenge_id: challenge, code: data.get("code") });
    if (stage === "enroll") return;
    const s = await api<{ authenticated: boolean; papel: Papel }>("/api/admin/auth/session");
    if (!s.authenticated) throw new Error("Acesso administrativo ainda não confirmado (AAL2)."); setPapel(s.papel); setNotice("Sessão AAL2 confirmada."); setCode("");
  }
  async function mutate(path: string, body: unknown, text: string) {
    setError("");
    setNotice("");
    try {
      await api(path, body);
    } catch (e) {
      if (e instanceof AdminApiError && e.status === 409 && selected && section !== "equipe") setConflito(true);
      throw e;
    }
    setNotice(text);
    if (selected && section !== "equipe") {
      try {
        await recarregarSelecionado();
      } catch (e) {
        setConflito(true);
        setFailure(e);
      }
    }
    await load();
  }
  async function carregarDetalhe(id: string) {
    const result = await api<Detalhe>("/api/admin/ocorrencias/" + encodeURIComponent(id));
    setDetalhe(result);
    setSelected(result.ocorrencia);
  }
  async function recarregarSelecionado() {
    if (!selected?.id) return;
    if (section === "fila") await carregarDetalhe(String(selected.id));
    if (section === "denuncias" || section === "respostas") {
      const query = new URLSearchParams({ id: String(selected.id), limite: "1" });
      const result = await api<Pagina>(`/api/admin/${section}?${query}`);
      const item = result.itens[0];
      if (!item) throw new Error("O item selecionado não está mais disponível.");
      setSelected(item);
    }
    setConflito(false);
    setError("");
  }
  function limparSelecao() {
    setSelected(null);
    setDetalhe(null);
    setConflito(false);
    setModAction("");
    setModReason("");
    setModCode("outro");
    setRespostaAcao("");
    setDenunciaStatus("");
  }
  async function choose(item: Item) {
    setBusy(true);
    setError("");
    limparSelecao();
    try {
      if (section === "fila" && item.id) await carregarDetalhe(String(item.id));
      else setSelected(item);
    } finally {
      setBusy(false);
    }
  }
  function changeSection(next: string) {
    if (section === next) return;
    setSection(next);
    setError("");
    limparSelecao();
  }
  if (!papel) return <section className="mx-auto max-w-lg rounded-2xl border bg-white p-6 shadow-sm">
    <h1 className="text-2xl font-bold">Acesso administrativo</h1>
    <p className="mt-2 text-sm text-gray-600">A sessão operacional exige MFA TOTP e confirmação de AAL2.</p>
    {error && <p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-800">{error}</p>}
    {stage === "login" ? <form className="mt-5 space-y-4" onSubmit={e => void submit(e, login)}>
      <label className="block">Email<input className="mt-1 w-full rounded border p-2" name="email" type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label className="block">Senha<input className="mt-1 w-full rounded border p-2" name="password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button disabled={busy} className="rounded bg-emerald-900 px-4 py-2 text-white">Entrar</button></form> :
      <form className="mt-5 space-y-4" onSubmit={e => void submit(e, verify)}>{enrollInfo&&stage==="enroll"&&<div className="rounded bg-gray-50 p-3 text-sm"><p>Cadastre este fator TOTP no aplicativo autenticador.</p>{enrollInfo.totp.qr_code.startsWith("data:image/")&&<Image alt="QR de inscrição TOTP" unoptimized width={192} height={192} className="my-3 max-h-48 w-auto" src={enrollInfo.totp.qr_code}/>}<code className="break-all">{enrollInfo.totp.secret}</code></div>}<label className="block">Código TOTP de seis dígitos<input className="mt-1 w-full rounded border p-2" name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value)} /></label><button disabled={busy} className="rounded bg-emerald-900 px-4 py-2 text-white">{stage==="enroll"?"Continuar para verificação":"Confirmar MFA"}</button></form>}
  </section>;
  const podeDecidir = !busy && !conflito && typeof selected?.versao_admin === "number";
  return <div><header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm uppercase text-emerald-900">Observatório Goiás</p><h1 className="text-3xl font-bold">Console administrativo</h1><p>Sessão AAL2 · {papel}</p></div><button className="rounded border px-4 py-2" onClick={()=>run(async()=>{await api("/api/admin/auth/logout",{});setPapel(null);setStage("login");})}>Encerrar sessão</button></header>
    {error && <p role="alert" className="my-4 rounded bg-red-50 p-3 text-red-800">{error}</p>}{notice && <p role="status" className="my-4 rounded bg-green-50 p-3 text-green-800">{notice}</p>}

    <nav className="my-5 flex flex-wrap gap-2">
      {["fila", "denuncias", "respostas", ...(papel === "moderador" ? [] : ["auditoria"]), ...(papel === "superadmin" ? ["equipe"] : [])].map(s =>
        <button key={s} disabled={busy} className={s === section ? "rounded-full bg-emerald-900 px-4 py-2 text-white" : "rounded-full border px-4 py-2"} onClick={() => changeSection(s)}>
          {s[0].toUpperCase() + s.slice(1)}
        </button>
      )}
    </nav>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border bg-white">
        <div className="flex justify-between border-b p-4">
          <h2 className="text-xl font-semibold">{section}</h2>
          <button disabled={busy} onClick={() => { setError(""); run(() => load()); }} className="underline">Atualizar</button>
        </div>
        {section === "fila" && <fieldset disabled={busy} className="space-y-2 border-b p-4">
          <legend className="sr-only">Filtros da fila</legend>
          <label className="mr-4">Pendências{" "}
            <select value={filtros.pendencia} onChange={e => {
              const pendencia = e.target.value as FiltrosFilaAdmin["pendencia"];
              setError("");
              setFiltros(v => ({ ...v, pendencia }));
            }} className="rounded border p-1">
              <option value="">Todas</option>
              <option value="denuncia">Com denúncias abertas</option>
              <option value="foto_pendente">Com fotos pendentes</option>
            </select>
          </label>
          <label>Ordem{" "}
            <select value={filtros.ordem} onChange={e => {
              const ordem = e.target.value as FiltrosFilaAdmin["ordem"];
              setError("");
              setFiltros(v => ({ ...v, ordem }));
            }} className="rounded border p-1">
              <option value="antigos">Mais antigos primeiro</option>
              <option value="recentes">Mais recentes primeiro</option>
            </select>
          </label>
          {resumo && <p className="text-sm text-gray-600">
            Na fila: {resumo.com_denuncias} relatos com denúncias abertas · {resumo.com_fotos_pendentes} com fotos pendentes.
            {" "}Resumo calculado em <time dateTime={resumo.calculado_em}>{dataResumo.format(new Date(resumo.calculado_em))}</time>.
          </p>}
          <p className="text-sm text-gray-600">Use Atualizar para voltar à primeira página e consultar novas pendências.</p>
        </fieldset>}
        {busy ? <p className="p-4">Carregando…</p> : rows.length ? rows.map(row => {
          const audit = section === "auditoria" ? resumoAuditoriaAdmin(row) : null;
          return <button key={row.id || row.user_id} onClick={() => run(() => choose(row))} className="block w-full border-b p-4 text-left hover:bg-gray-50">
            <strong>{audit?.titulo || row.protocolo || row.user_id || row.id}</strong>
            {audit ? null : <> · {row.titulo || row.texto || row.papel}</>}
            <small className="block text-gray-600">{audit?.detalhe || row.municipio_nome || row.moderacao || row.status || String(row.ativo)}</small>
            {section === "fila" && <small className="block text-gray-600">
              {row.criado_em && <time dateTime={row.criado_em}>{dataResumo.format(new Date(row.criado_em))}</time>}
              {row.denuncias_abertas ? ` · ${row.denuncias_abertas} denúncias abertas` : ""}
              {row.imagens_pendentes ? ` · ${row.imagens_pendentes} fotos pendentes` : ""}
            </small>}
          </button>;
        }) : <p className="p-4 text-gray-600">Nenhum item encontrado.</p>}
        {historico.length > 1 && <button disabled={busy} className="m-4 rounded border px-4 py-2" onClick={() => {
          setError("");
          run(() => load(voltarPaginaAdmin(historico)));
        }}>Página anterior</button>}
        {hasMore && <button disabled={busy} className="m-4 rounded border px-4 py-2" onClick={() => {
          setError("");
          if (section === "auditoria") run(() => load(undefined, offset + 50));
          else if (cursor) run(() => load(avancarPaginaAdmin(historico, cursor)));
        }}>Carregar próxima página</button>}
      </section>
      <section className="rounded-xl border bg-white p-5">{selected ? <>
        <p className="text-sm">{selected.protocolo}</p>
        <h2 className="text-2xl font-semibold">{selected.titulo || selected.texto}</h2>
        <p className="my-3 whitespace-pre-wrap">{selected.descricao}</p>
        {(selected.moderacao || selected.situacao || selected.status) && <p className="mb-3 text-sm">
          {[selected.moderacao && `Moderação: ${selected.moderacao}`, selected.situacao && `Situação: ${selected.situacao}`, selected.status && `Estado: ${selected.status}`].filter(Boolean).join(" · ")}
        </p>}
        {conflito && <button type="button" disabled={busy} className="mb-3 rounded border px-3 py-2" onClick={() => run(async () => {
          setBusy(true);
          try { await recarregarSelecionado(); setNotice("Estado atualizado. Confira o item antes de confirmar novamente."); }
          finally { setBusy(false); }
        })}>Recarregar estado do item</button>}
        {section === "fila" && <>
          <fieldset disabled={!podeDecidir} className="flex flex-wrap gap-2">
            <legend className="sr-only">Ações de moderação</legend>
            {["aprovar", "reter", "remover", ...(papel === "moderador" ? [] : ["restaurar"])].map(a =>
              <button key={a} className="rounded border px-3 py-2" onClick={() => { setModAction(a); setModReason(""); }}>{a}</button>
            )}
          </fieldset>
          {modAction && <form className="mt-3 space-y-2 rounded bg-gray-50 p-3" onSubmit={e => void submit(e, async d => {
            if (!podeDecidir) return;
            await mutate("/api/admin/ocorrencias/" + selected.id + "/moderar", {
              acao: modAction,
              versao_esperada: selected.versao_admin,
              ...(modAction !== "aprovar" ? { motivo: d.get("motivo") } : {}),
              ...(modAction === "remover" ? { motivo_codigo: d.get("motivo_codigo") } : {}),
            }, "Moderação atualizada.");
            setModAction("");
            setModReason("");
          })}>
            <fieldset disabled={!podeDecidir} className="space-y-2">
              <legend className="font-semibold">Confirmar ação: {modAction}</legend>
              {modAction !== "aprovar" && <label className="block">Motivo obrigatório<textarea name="motivo" required minLength={1} maxLength={1000} value={modReason} onChange={e => setModReason(e.target.value)} className="mt-1 w-full rounded border p-2"/></label>}
              {modAction === "remover" && <label className="block">Código do motivo<select name="motivo_codigo" value={modCode} onChange={e => setModCode(e.target.value)} className="mt-1 w-full rounded border p-2">{["dados_pessoais", "conteudo_ofensivo", "fora_escopo", "spam", "duplicidade", "outro"].map(c => <option key={c}>{c}</option>)}</select></label>}
              <button className="rounded bg-emerald-900 px-3 py-2 text-white">Confirmar</button>
              <button type="button" className="ml-2 rounded border px-3 py-2" onClick={() => setModAction("")}>Cancelar</button>
            </fieldset>
          </form>}
          <form className="mt-5 border-t pt-4" onSubmit={e => void submit(e, async d => {
            if (!podeDecidir) return;
            await mutate("/api/admin/ocorrencias/" + selected.id + "/situacao", {
              situacao: d.get("situacao"), texto: d.get("texto"), evidencia: d.get("evidencia") || undefined,
              publica: d.get("publica") === "on", versao_esperada: selected.versao_admin,
            }, "Situação atualizada.");
          })}>
            <fieldset disabled={!podeDecidir} className="space-y-3">
              <legend className="font-semibold">Situação e atualização pública</legend>
              <select aria-label="Nova situação" name="situacao" defaultValue={selected.situacao} className="w-full rounded border p-2">{situacoes.map(s => <option key={s}>{s}</option>)}</select>
              <textarea name="texto" required maxLength={4000} className="w-full rounded border p-2" placeholder="Texto da atualização"/>
              <textarea name="evidencia" maxLength={4000} className="w-full rounded border p-2" placeholder="Evidência (exigida para resolvido)"/>
              <label><input name="publica" type="checkbox" defaultChecked/> Pública</label>
              <button className="block rounded bg-emerald-900 px-4 py-2 text-white">Salvar</button>
            </fieldset>
          </form>
          <form className="mt-4 space-y-3 border-t pt-4" onSubmit={e => void submit(e, async d => {
            const tipo = d.get("tipo");
            await mutate("/api/admin/ocorrencias/" + selected.id + "/atualizacoes", { tipo, texto: d.get("texto"), publica: tipo === "nota" ? false : d.get("publica") === "on" }, "Atualização registrada.");
          })}>
            <fieldset disabled={busy || conflito} className="space-y-3">
              <legend className="font-semibold">Adicionar atualização ou nota privada</legend>
              <select aria-label="Tipo da atualização" name="tipo" className="w-full rounded border p-2">
                <option value="providencia">Providência</option><option value="evidencia">Evidência</option>
                <option value="resposta_oficial">Resposta oficial</option><option value="nota">Nota privada</option>
              </select>
              <textarea aria-label="Texto da atualização ou nota" name="texto" required maxLength={4000} className="w-full rounded border p-2"/>
              <label><input name="publica" type="checkbox" defaultChecked/> Pública (desconsiderada para nota privada)</label>
              <button className="block rounded border px-3 py-2">Adicionar</button>
            </fieldset>
          </form>
          {detalhe && selected.id && <>
            <section className="mt-4 border-t pt-3">
              <h3 className="font-semibold">Fotos</h3>
              {detalhe.imagens.length ? <ul>{detalhe.imagens.map(img => <li key={img.id}>Foto {img.ordem} · {img.moderacao}</li>)}</ul> : <p>Nenhuma foto.</p>}
            </section>
            {(Object.keys(colecoes) as ColecaoAdmin[]).map(colecao =>
              <ListaColecao key={`${selected.id}:${colecao}`} id={String(selected.id)} colecao={colecao} temItens={detalhe.resumos[`tem_${colecao}`]} onError={setFailure}/>
            )}
          </>}
        </>}
        {section === "denuncias" && <form className="mt-4" onSubmit={e => void submit(e, async () => {
          if (!podeDecidir || !denunciaStatus) return;
          await mutate("/api/admin/denuncias/" + selected.id + "/resolver", { status: denunciaStatus, versao_esperada: selected.versao_admin }, "Denúncia atualizada.");
          setDenunciaStatus("");
        })}>
          <fieldset disabled={!podeDecidir} className="flex flex-wrap gap-2">
            <legend className="font-semibold">Resolver denúncia</legend>
            <select aria-label="Novo estado da denúncia" required value={denunciaStatus} onChange={e => setDenunciaStatus(e.target.value)} className="rounded border px-2 py-1">
              <option value="">Selecione o estado</option>
              {["em_analise", "procedente", "improcedente"].map(s => <option key={s}>{s}</option>)}
            </select>
            <button className="rounded border px-2 py-1">Confirmar</button>
          </fieldset>
        </form>}
        {section === "respostas" && <form className="mt-4" onSubmit={e => void submit(e, async d => {
          if (!podeDecidir || !respostaAcao) return;
          await mutate("/api/admin/respostas/" + selected.id + "/revisar", {
            acao: respostaAcao, versao_esperada: selected.versao_admin,
            ...(respostaAcao === "rejeitar" ? { motivo: d.get("motivo") } : {}),
          }, "Resposta revisada.");
          setRespostaAcao("");
        })}>
          <fieldset disabled={!podeDecidir} className="space-y-2">
            <legend className="font-semibold">Revisar resposta</legend>
            <select aria-label="Ação sobre a resposta" required value={respostaAcao} onChange={e => setRespostaAcao(e.target.value as typeof respostaAcao)} className="rounded border p-2">
              <option value="">Selecione a ação</option><option value="publicar">Publicar</option><option value="rejeitar">Rejeitar</option>
            </select>
            {respostaAcao === "rejeitar" && <label className="block">Motivo da rejeição<textarea name="motivo" required maxLength={1000} className="block w-full rounded border p-2"/></label>}
            <button className="block rounded border p-2">Confirmar</button>
          </fieldset>
        </form>}

      {section==="equipe"&&papel==="superadmin"&&<><form className="mt-4 space-y-2 border-t pt-4" onSubmit={e=>void submit(e,async d=>{const result=await api<{convite_enviado?:boolean;link_convite?:string}>("/api/admin/equipe/convidar",{email:d.get("email"),papel:d.get("papel"),motivo:d.get("motivo")});setInviteLink(result.link_convite||"");setNotice(result.link_convite?"Convite criado. Entregue o link ao convidado por um canal seguro.":"Convite enviado.");await load();})}><h3 className="font-semibold">Convidar administrador</h3><input name="email" required type="email" placeholder="Email" className="w-full rounded border p-2"/><select name="papel" className="w-full rounded border p-2">{["moderador","gestor","superadmin"].map(x=><option key={x}>{x}</option>)}</select><input name="motivo" required placeholder="Motivo auditável" className="w-full rounded border p-2"/><button className="rounded border px-3 py-2">Convidar</button></form>{inviteLink&&<p className="mt-3 break-all rounded bg-amber-50 p-3 text-sm">Link de uso único para entrega manual: <a className="underline" href={inviteLink}>{inviteLink}</a></p>}{selected&&<form className="mt-4 space-y-2 border-t pt-4" onSubmit={e=>void submit(e,async d=>{await api("/api/admin/equipe/"+selected.user_id+"/papel",{papel:d.get("papel"),motivo:d.get("motivo")});setNotice("Papel alterado.");await load();})}><h3 className="font-semibold">Alterar papel / desativar</h3><select name="papel" className="w-full rounded border p-2">{["moderador","gestor","superadmin"].map(x=><option key={x}>{x}</option>)}</select><input name="motivo" required placeholder="Motivo auditável" className="w-full rounded border p-2"/><button className="rounded border p-2">Alterar papel</button><button type="button" className="ml-2 rounded border p-2" onClick={()=>{const motivo=window.prompt("Motivo da desativação");if(motivo)run(()=>mutate("/api/admin/equipe/"+selected.user_id+"/desativar",{motivo},"Administrador desativado."));}}>Desativar</button></form>}</>}
      </>:<p className="text-gray-600">Selecione um item para consultar os detalhes.</p>}</section></div>
  </div>;
}
