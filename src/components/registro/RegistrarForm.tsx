"use client";

import Script from "next/script";
import { AvisoConexao } from "@/components/AvisoConexao";
import { EtapaFotos, type FotoRegistro } from "./EtapaFotos";
import { protegerFotosNaoEnviadas } from "./envio-fotos";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { gerarToken, hashToken, tokenSchema } from "@/lib/registro/token";
import { LIMITE_DESCRICAO, LIMITE_TITULO } from "@/lib/registro/schemas";
import { criarCorpoRegistro, criarLinkPrivado, permiteEditarAposErro } from "./fluxo";

import { ETAPAS, validarEtapa, lerRascunho, enviarRegistro } from "./etapas";

type Opcao = { slug: string; nome: string };
type Campos = { municipio: string; categoria: string; titulo: string; descricao: string };
type Tentativa = Campos & { token: string; tokenHash: string; chaveIdempotencia: string };
type Props = { municipios: Opcao[]; categorias: Opcao[]; siteKey: string | undefined; indisponivel: boolean; municipioInicial?: string; fotosHabilitadas?: boolean };
const STORAGE_KEY = "og.registro.m3.v1";
const DRAFT_KEY = "og.registro.rascunho.v1";
const VAZIO: Campos = { municipio: "", categoria: "", titulo: "", descricao: "" };

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

function lerTentativa(): Tentativa | null {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (!salvo) return null;
    const v: unknown = JSON.parse(salvo);
    if (!v || typeof v !== "object") throw new Error();
    const t = v as Record<string, unknown>;
    if (!tokenSchema.safeParse(t.token).success || typeof t.tokenHash !== "string" || !/^[a-f0-9]{64}$/.test(t.tokenHash)
      || typeof t.chaveIdempotencia !== "string" || !/^[0-9a-f-]{36}$/i.test(t.chaveIdempotencia)
      || typeof t.municipio !== "string" || typeof t.categoria !== "string" || typeof t.titulo !== "string" || typeof t.descricao !== "string"
      || t.titulo.length > LIMITE_TITULO || t.descricao.length > LIMITE_DESCRICAO) throw new Error();
    return t as Tentativa;
  } catch {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    return null;
  }
}

function mensagens(codigo: string | undefined, status: number): string {
  if (status === 503 || codigo === "indisponivel") return "Registro indisponível no momento. Tente novamente mais tarde.";
  if (status === 429 || codigo === "limite_excedido") return "Muitos envios em pouco tempo. Tente de novo mais tarde.";
  if (codigo === "captcha_invalido") return "A verificação expirou ou não foi concluída. Faça a verificação e tente novamente.";
  return "Não conseguimos enviar agora. Seus campos e o link privado continuam salvos neste aparelho. Tente novamente.";
}

export function RegistrarForm({ municipios, categorias, siteKey, indisponivel, municipioInicial = "", fotosHabilitadas = false }: Props) {
  const [campos, setCampos] = useState<Campos>({ ...VAZIO, municipio: municipios.some(m => m.slug === municipioInicial) ? municipioInicial : "" });
  const [etapa, setEtapa] = useState(0);
  const [fotos, setFotos] = useState<FotoRegistro[]>([]);
  const [fotosPreparando, setFotosPreparando] = useState(false);
  const [descarte, setDescarte] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const [armazenamentoErro, setArmazenamentoErro] = useState(false);
  const tituloEtapa = useRef<HTMLHeadingElement>(null);
  const [tentativa, setTentativa] = useState<Tentativa | null>(null);
  const [captcha, setCaptcha] = useState("");
  const [captchaPronto, setCaptchaPronto] = useState(false);
  const [estado, setEstado] = useState<"pronto" | "enviando" | "erro" | "sucesso">("pronto");
  const [erro, setErro] = useState("");
  const [errosCampos, setErrosCampos] = useState<Partial<Record<keyof Campos, string>>>({});
  const [protocolo, setProtocolo] = useState("");
  const [mensagemLink, setMensagemLink] = useState("");
  const resumo = useRef<HTMLDivElement>(null);
  const captchaEl = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);
  const bloqueado = indisponivel || !siteKey || !municipios.length || !categorias.length;
  const totalEtapas = fotosHabilitadas ? 5 : 4;
  const numeroEtapa = etapa + 1 - (!fotosHabilitadas && etapa > 3 ? 1 : 0);
  useEffect(() => {
    if (fotosHabilitadas && fotos.some(f => f.estado !== "enviada")) return protegerFotosNaoEnviadas(window);
  }, [fotos, fotosHabilitadas]);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      let draft: Campos | null = null;
      try { draft = lerRascunho(localStorage.getItem(DRAFT_KEY)); } catch { setArmazenamentoErro(true); }
      if (draft && ativo) setCampos(draft);
      const salvo = lerTentativa();
      if (salvo && await hashToken(salvo.token) === salvo.tokenHash && ativo) {
        setTentativa(salvo);
        setCampos({ municipio: salvo.municipio, categoria: salvo.categoria, titulo: salvo.titulo, descricao: salvo.descricao });
      } else if (salvo) localStorage.removeItem(STORAGE_KEY);
      if (ativo) setCarregado(true);
    })();
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (!carregado || estado === "sucesso") return;
    let ativo = true;
    void Promise.resolve().then(() => {
      if (!ativo) return;
      try {
        if (Object.values(campos).every(v => !v)) { localStorage.removeItem(DRAFT_KEY); setSalvo(false); }
        else { localStorage.setItem(DRAFT_KEY, JSON.stringify(campos)); setSalvo(true); }
      } catch { setArmazenamentoErro(true); setSalvo(false); }
    });
    return () => { ativo = false; };
  }, [campos, carregado, estado]);

  function mudarEtapa(proxima: number) {
    if (!fotosHabilitadas && proxima === 3) proxima = etapa === 4 ? 2 : 4;
    setErrosCampos({}); setErro(""); setEtapa(proxima);
    requestAnimationFrame(() => tituloEtapa.current?.focus());
  }

  useEffect(() => {
    if (!captchaPronto || !siteKey || !captchaEl.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(captchaEl.current, {
      sitekey: siteKey,
      callback: setCaptcha,
      "expired-callback": () => setCaptcha(""),
      "error-callback": () => { setCaptcha(""); setErro("A verificação de segurança está indisponível. Tente novamente mais tarde."); },
    });
  }, [captchaPronto, siteKey]);

  function atualizar(campo: keyof Campos, valor: string) {
    setCampos((anterior) => ({ ...anterior, [campo]: valor }));
    setErrosCampos((anterior) => ({ ...anterior, [campo]: undefined }));
    if (estado === "erro") setErro("");
  }

  function validar(): boolean {
    const novos = etapa === 4 ? Object.assign({}, ...[0, 1, 2].map(n => validarEtapa(campos, n))) : validarEtapa(campos, etapa);
    if (etapa === 4 && Object.keys(novos).length) {
      const primeira = [0, 1, 2].find(n => Object.keys(validarEtapa(campos, n)).length);
      if (primeira !== undefined) setEtapa(primeira);
    }
    setErrosCampos(novos);
    if (Object.keys(novos).length) { requestAnimationFrame(() => resumo.current?.focus()); return false; }
    return true;
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (fotosPreparando) return;
    if (!validar()) return;
    if (etapa >= 3 && fotos.some(f => f.contexto.trim().length < 3)) { setErro("Descreva o que cada foto mostra ou remova a foto antes de continuar."); return; }
    if (etapa < 4) { mudarEtapa(etapa + 1); return; }
    if (bloqueado) return;
    if (!captcha) { setErro("Conclua a verificação de segurança antes de enviar."); requestAnimationFrame(() => resumo.current?.focus()); return; }
    setEstado("enviando"); setErro("");
    try {
      let tentativaAtual = tentativa;
      if (!tentativaAtual) {
        const token = gerarToken();
        tentativaAtual = { ...campos, token, tokenHash: await hashToken(token), chaveIdempotencia: crypto.randomUUID() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tentativaAtual));
        setTentativa(tentativaAtual);
      }
      const corpo = criarCorpoRegistro({ ...campos, tokenHash: tentativaAtual.tokenHash, chaveIdempotencia: tentativaAtual.chaveIdempotencia, turnstile: captcha });
      const confirmado = await enviarRegistro(corpo);
      setProtocolo(confirmado); setEstado("sucesso"); localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(DRAFT_KEY);
    } catch (falha) {
      const f = falha as { status?: number; codigo?: string };
      if (permiteEditarAposErro(f.codigo)) {
        localStorage.removeItem(STORAGE_KEY);
        setTentativa(null);
        setErro("Revise os campos. Nenhum relato foi registrado; corrija os dados e tente novamente.");
      } else setErro(mensagens(f.codigo, f.status ?? 0));
      setEstado("erro"); requestAnimationFrame(() => resumo.current?.focus());
    } finally {
      setCaptcha("");
      if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    }
  }

  const link = tentativa ? criarLinkPrivado(typeof window === "undefined" ? "https://observatorio.test" : window.location.origin, tentativa.token) : "";

  async function copiarLink() {
    try {
      if (navigator.clipboard) await navigator.clipboard.writeText(link);
      else {
        const campo = document.createElement("textarea"); campo.value = link; campo.setAttribute("readonly", "");
        campo.style.position = "fixed"; campo.style.opacity = "0"; document.body.append(campo); campo.select();
        const copiou = document.execCommand("copy"); campo.remove(); if (!copiou) throw new Error("copy unavailable");
      }
      setMensagemLink("Link privado copiado.");
    } catch { setMensagemLink("Não foi possível copiar. Abra o acompanhamento e copie o link pela barra do navegador."); }
  }

  if (estado === "sucesso" && tentativa) return <section aria-labelledby="sucesso-titulo" className="space-y-5">
    <div className="rounded-cartao border border-borda bg-sucesso-fundo p-5" role="status">
      <h2 id="sucesso-titulo" tabIndex={-1} ref={(el) => el?.focus()} className="text-xl font-bold">Relato recebido</h2>
      <p className="mt-2">Protocolo: <strong>{protocolo}</strong></p>
    </div>
    <div className="rounded-cartao border border-borda bg-superficie p-5">
      <h3 className="font-bold">Guarde seu link privado</h3>
      <p className="mt-2">Este link é a única forma de acompanhar o relato e pedir sua exclusão. Quem tiver o link poderá fazer isso. Guarde-o em local seguro.</p>
      <p className="mt-2 break-all text-sm">{link}</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button className="min-h-12 rounded-controle bg-acao px-4 font-semibold text-sobre-acao" onClick={() => void copiarLink()}>Copiar link privado</button>
        <button className="min-h-12 rounded-controle border border-borda px-4 font-semibold" onClick={() => {
          if (navigator.share) void navigator.share({ title: "Acompanhar meu relato", url: link });
          else void copiarLink();
        }}>Compartilhar link privado</button>
      </div>
      {mensagemLink && <p role="status" className="mt-3">{mensagemLink}</p>}
    </div>
    {fotosHabilitadas && <EtapaFotos fotos={fotos} mudar={setFotos} token={tentativa.token} confirmado />}
    <a className="inline-flex min-h-12 items-center font-semibold underline" href={link}>Abrir acompanhamento</a>
  </section>;

  return <>
    <AvisoConexao />
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => setCaptchaPronto(true)} onError={() => setErro("A verificação de segurança está indisponível. Tente novamente mais tarde.")} />
    <form onSubmit={enviar} noValidate className="space-y-5">
      <h2 ref={tituloEtapa} tabIndex={-1} aria-live="polite" className="text-xl font-bold">Etapa {numeroEtapa} de {totalEtapas} · {ETAPAS[etapa]}</h2>
      <progress max={totalEtapas} value={numeroEtapa} aria-label={`Progresso: etapa ${numeroEtapa} de ${totalEtapas}`} className="w-full" />
      <p className="text-sm">{numeroEtapa - 1} de {totalEtapas} etapas concluídas</p>
      {salvo && <p role="status">Rascunho salvo neste aparelho</p>}
      {armazenamentoErro && <p role="status">Não foi possível salvar o rascunho neste aparelho. Mantenha esta página aberta.</p>}
      {!tentativa && <button type="button" className="min-h-12 underline" onClick={() => setDescarte(true)}>Descartar rascunho</button>}
      {descarte && <section aria-label="Confirmar descarte" className="rounded-controle border border-borda p-4"><p>Descartar o rascunho deste aparelho? Os campos serão apagados.</p><button type="button" className="min-h-12 px-3 underline" onClick={() => { try { localStorage.removeItem(DRAFT_KEY); } catch {} setCampos(VAZIO); setSalvo(false); setDescarte(false); mudarEtapa(0); }}>Confirmar descarte</button><button type="button" className="min-h-12 px-3 underline" onClick={() => setDescarte(false)}>Continuar preenchendo</button></section>}
      {erro && <div ref={resumo} tabIndex={-1} role="alert" className="rounded-controle border border-erro bg-erro-fundo p-4 text-erro">{erro}</div>}
      {Object.keys(errosCampos).length > 0 && <div ref={resumo} tabIndex={-1} role="alert" className="rounded-controle border border-erro bg-erro-fundo p-4 text-erro"><p>Confira estes campos:</p><ul className="list-inside list-disc">{Object.entries(errosCampos).map(([campo, texto]) => <li key={campo}><a className="underline" href={`#campo-${campo}`}>{texto}</a></li>)}</ul></div>}
      {bloqueado && <p role="status" className="rounded-controle bg-neutro-fundo p-4">Registro indisponível no momento. Tente novamente mais tarde.</p>}
      {tentativa && <p role="status" className="rounded-controle bg-info-fundo p-4">Uma tentativa anterior está salva neste aparelho. Continue com os mesmos dados para repetir com segurança.</p>}
      <fieldset disabled={estado === "enviando" || estado === "sucesso" || bloqueado || Boolean(tentativa)} className="space-y-5">
        <legend className="sr-only">Dados do relato</legend>
        <div hidden={etapa !== 0}>
          <label htmlFor="campo-municipio" className="mb-1 block font-semibold">Município <span>(obrigatório)</span></label>
          <select id="campo-municipio" required value={campos.municipio} onChange={(e) => atualizar("municipio", e.target.value)} aria-invalid={Boolean(errosCampos.municipio)} aria-describedby={errosCampos.municipio ? "erro-municipio" : undefined} className="min-h-12 w-full rounded-controle border border-borda bg-superficie px-3">
            <option value="">Escolha um município</option>{municipios.map((m) => <option key={m.slug} value={m.slug}>{m.nome}</option>)}
          </select>{errosCampos.municipio && <p id="erro-municipio" className="mt-1 text-erro">{errosCampos.municipio}</p>}
        </div>
        <div hidden={etapa !== 1}>
          <label htmlFor="campo-categoria" className="mb-1 block font-semibold">Categoria <span>(obrigatória)</span></label>
          <select id="campo-categoria" required value={campos.categoria} onChange={(e) => atualizar("categoria", e.target.value)} aria-invalid={Boolean(errosCampos.categoria)} aria-describedby={errosCampos.categoria ? "erro-categoria" : undefined} className="min-h-12 w-full rounded-controle border border-borda bg-superficie px-3">
            <option value="">Escolha uma categoria</option>{categorias.map((c) => <option key={c.slug} value={c.slug}>{c.nome}</option>)}
          </select>{errosCampos.categoria && <p id="erro-categoria" className="mt-1 text-erro">{errosCampos.categoria}</p>}
        </div>
        <div hidden={etapa !== 2}>
          <label htmlFor="campo-titulo" className="mb-1 block font-semibold">Título <span>(obrigatório)</span></label>
          <input id="campo-titulo" required minLength={5} maxLength={LIMITE_TITULO} value={campos.titulo} onChange={(e) => atualizar("titulo", e.target.value)} aria-invalid={Boolean(errosCampos.titulo)} aria-describedby={`ajuda-titulo${errosCampos.titulo ? " erro-titulo" : ""}`} className="min-h-12 w-full rounded-controle border border-borda bg-superficie px-3" placeholder="Descreva em poucas palavras" />
          <p id="ajuda-titulo" className="mt-1 text-sm text-texto-suave">{campos.titulo.length}/{LIMITE_TITULO} caracteres</p>{errosCampos.titulo && <p id="erro-titulo" className="text-erro">{errosCampos.titulo}</p>}
        </div>
        <div hidden={etapa !== 2}>
          <label htmlFor="campo-descricao" className="mb-1 block font-semibold">Descrição <span>(obrigatória)</span></label>
          <textarea id="campo-descricao" required minLength={20} maxLength={LIMITE_DESCRICAO} rows={6} value={campos.descricao} onChange={(e) => atualizar("descricao", e.target.value)} aria-invalid={Boolean(errosCampos.descricao)} aria-describedby={`ajuda-descricao${errosCampos.descricao ? " erro-descricao" : ""}`} className="w-full rounded-controle border border-borda bg-superficie px-3 py-3" placeholder="Conte o que está acontecendo" />
          <p id="ajuda-descricao" className="mt-1 text-sm text-texto-suave">{campos.descricao.length}/{LIMITE_DESCRICAO} caracteres</p>{errosCampos.descricao && <p id="erro-descricao" className="text-erro">{errosCampos.descricao}</p>}
        </div>
      </fieldset>
      {fotosHabilitadas && etapa === 3 && <EtapaFotos fotos={fotos} mudar={setFotos} aoPreparar={setFotosPreparando} />}
      {etapa === 4 && <section className="space-y-3"><h3 className="font-bold">Registro anônimo · confira seu relato</h3><p>Não coletamos nome, telefone ou contato. Seu relato será analisado antes de aparecer no site.</p><dl className="space-y-2 break-words"><dt className="font-semibold">Município</dt><dd>{municipios.find(m => m.slug === campos.municipio)?.nome}</dd><dt className="font-semibold">Categoria</dt><dd>{categorias.find(c => c.slug === campos.categoria)?.nome}</dd><dt className="font-semibold">Título</dt><dd>{campos.titulo}</dd><dt className="font-semibold">Descrição</dt><dd className="whitespace-pre-wrap">{campos.descricao}</dd></dl></section>}
      <p className="rounded-controle bg-neutro-fundo p-4">Não inclua nomes, telefones, documentos ou endereço residencial. Você não precisa informar nome ou contato. Seu relato será analisado antes de aparecer no site.</p>
      <p className="text-sm text-texto-suave">Os dados e a chave da tentativa ficam salvos neste aparelho até o envio ser confirmado. Em aparelho compartilhado, considere isso antes de continuar.</p>
      <div hidden={etapa !== 4} className="min-h-16" aria-label="Verificação de segurança"><div ref={captchaEl} />{!siteKey && <p className="text-sm text-texto-suave">A verificação de segurança está indisponível.</p>}</div>
      {etapa > 0 && <button type="button" disabled={estado === "enviando" || fotosPreparando} className="min-h-12 w-full rounded-controle border border-borda px-5 font-semibold" onClick={() => mudarEtapa(etapa - 1)}>Voltar à etapa anterior</button>}
      {etapa === 4 && !captcha && !bloqueado && <p id="motivo-envio">Conclua a verificação de segurança para enviar.</p>}
      <button type="submit" aria-describedby={etapa === 4 && !captcha && !bloqueado ? "motivo-envio" : undefined} disabled={fotosPreparando || estado === "enviando" || estado === "sucesso" || (etapa === 4 && (bloqueado || !captcha))} className="min-h-12 w-full rounded-controle bg-acao px-5 font-bold text-sobre-acao disabled:cursor-not-allowed disabled:opacity-60">
        {etapa < 4 ? "Continuar" : estado === "enviando" ? "Enviando relato…" : estado === "erro" ? "Tentar novamente" : "Enviar relato"}
      </button>
    </form>
  </>;
}

export function SemJavaScript() {
  return <noscript><p className="my-4 rounded-controle border border-borda bg-aviso-fundo p-4">Para registrar e gerar seu link privado com segurança, ative o JavaScript. Nenhum relato será enviado sem esse link.</p></noscript>;
}
