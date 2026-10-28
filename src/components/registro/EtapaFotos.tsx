"use client";
import { useRef, useState } from "react";
import { comprimirFoto, validarSelecaoFotos } from "./comprimir-foto";

export type FotoRegistro = { id: string; arquivo: File; contexto: string; previa: string; ordem: number; estado: "pronta" | "enviando" | "enviada" | "erro"; progresso: number };
export function EtapaFotos({ fotos, mudar, token, confirmado = false, aoPreparar }: { fotos: FotoRegistro[]; mudar: (f: FotoRegistro[]) => void; token?: string; confirmado?: boolean; aoPreparar?: (valor: boolean) => void }) {
  const [erro, setErro] = useState("");
  const [preparando, setPreparando] = useState(false);
  const ocupada = useRef(false);
  async function selecionar(arquivos: File[]) {
    if (!arquivos.length || ocupada.current) return;
    ocupada.current = true; setPreparando(true); aoPreparar?.(true); setErro("");
    try {
    validarSelecaoFotos(fotos.length, arquivos);
    // Sequential decoding avoids holding three full-resolution bitmaps at once.
    const comprimidas: File[] = [];
    for (const arquivo of arquivos) comprimidas.push(await comprimirFoto(arquivo));
    const usadas = new Set(fotos.map(f => f.ordem));
    const novas = comprimidas.map(arquivo => { const ordem = [1,2,3].find(n => !usadas.has(n))!; usadas.add(ordem); return { id: crypto.randomUUID(), arquivo, contexto: "", previa: URL.createObjectURL(arquivo), ordem, estado: "pronta" as const, progresso: 0 }; });
    mudar([...fotos, ...novas]); setErro("");
    } catch (falha) {
      const mensagemSelecao = falha instanceof Error && (falha.message.startsWith("Use ") || falha.message.startsWith("Escolha "));
      setErro(mensagemSelecao ? falha.message : "Não foi possível preparar estas fotos. Escolha arquivos menores ou outro formato permitido.");
    }
    finally { ocupada.current = false; setPreparando(false); aoPreparar?.(false); }
  }
  function enviar(foto: FotoRegistro) {
    if (!token || foto.contexto.trim().length < 3) { setErro("Descreva o que cada foto mostra antes de enviar."); return; }
    const atualizar = (estado: FotoRegistro["estado"], progresso: number) => mudar(fotos.map(f => f.id === foto.id ? { ...f, estado, progresso } : f));
    atualizar("enviando", 0);
    const xhr = new XMLHttpRequest(); xhr.open("POST", "/api/imagem"); xhr.timeout = 45000;
    xhr.upload.onprogress = e => { if (e.lengthComputable) atualizar("enviando", Math.min(99, Math.round(e.loaded / e.total * 100))); };
    xhr.onload = () => atualizar(xhr.status === 201 ? "enviada" : "erro", xhr.status === 201 ? 100 : 0);
    xhr.onerror = xhr.ontimeout = () => atualizar("erro", 0);
    const dados = new FormData(); dados.set("token", token); dados.set("ordem", String(foto.ordem)); dados.set("contexto", foto.contexto.trim()); dados.set("foto", foto.arquivo); xhr.send(dados);
  }
  const enviando = preparando || fotos.some(f => f.estado === "enviando");
  return <section className="space-y-3" aria-label="Fotos opcionais">
    <h3 className="font-bold">Fotos (opcional) · até três</h3>
    <p>JPEG, PNG ou WebP de até 12 MB por original. Reduzimos a foto neste aparelho para até 1.600 pixels e 2 MB antes do envio. Não inclua rostos, placas ou documentos. As fotos passam por revisão e seus dados de localização são removidos.</p>
    <p>As fotos ficam somente nesta página até o envio. {confirmado ? "Seu relato já foi recebido. Envie cada foto abaixo; uma falha não apaga o relato." : "Depois de receber o protocolo, você poderá enviar cada foto."}</p>
    {!confirmado && <label className="block">Escolher fotos<input className="block min-h-12 w-full" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={enviando || fotos.length === 3} onChange={e => { const arquivos = [...(e.target.files ?? [])]; e.target.value = ""; void selecionar(arquivos); }} /></label>}
    {preparando && <p role="status">Preparando fotos neste aparelho… Aguarde as prévias antes de continuar.</p>}
    {erro && <p role="alert">{erro}</p>}
    {fotos.map(f => <div key={f.id} className="space-y-2 rounded-controle border border-borda p-3">
      {/* Local blob URLs are generated here, never accepted from external input. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={f.previa} alt={f.contexto.trim() || "Prévia da foto selecionada; descrição ainda não informada"} width={240} height={180} className="h-44 w-full object-contain" />
      <label className="block">O que a foto {f.ordem} mostra? (obrigatório)<input className="block min-h-12 w-full rounded-controle border border-borda px-3" maxLength={300} minLength={3} value={f.contexto} disabled={confirmado || enviando} onChange={e => mudar(fotos.map(v => v.id === f.id ? { ...v, contexto: e.target.value } : v))} /></label>
      {f.estado === "enviando" && <progress className="w-full" value={f.progresso} max={100} aria-label={`Envio da foto ${f.ordem}`} />}
      <p role="status">{f.estado === "enviada" ? "Foto recebida para revisão." : f.estado === "erro" ? "Esta foto não foi confirmada. Seu relato está preservado. Tente novamente com a mesma foto." : f.estado === "enviando" ? `Enviando: ${f.progresso}%` : "Foto ainda não enviada."}</p>
      {confirmado && f.estado !== "enviada" && <button type="button" className="min-h-12 px-3 underline" disabled={enviando} onClick={() => enviar(f)}>{f.estado === "erro" ? "Tentar novamente esta foto" : "Enviar esta foto"}</button>}
      {f.estado !== "enviada" && <button type="button" disabled={enviando} className="min-h-12 px-3 underline" onClick={() => { URL.revokeObjectURL(f.previa); mudar(fotos.filter(v => v.id !== f.id)); }}>Remover foto {f.ordem}{confirmado ? " desta página" : ""}</button>}
    </div>)}
  </section>;
}
