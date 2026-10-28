export type EstadoFoto = "pronta" | "enviando" | "enviada" | "erro" | "incerta";
type FotoEnvio = { id: string; arquivo: File; contexto: string; ordem: number; estado: EstadoFoto };
type AtualizarFoto = (id: string, estado: EstadoFoto, progresso: number) => void;

function enviarFoto(foto: FotoEnvio, token: string, atualizar: AtualizarFoto): Promise<void> {
  return new Promise(resolve => {
    atualizar(foto.id, "enviando", 0);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/imagem"); xhr.timeout = 45000;
    xhr.upload.onprogress = evento => {
      if (evento.lengthComputable) atualizar(foto.id, "enviando", Math.min(99, Math.round(evento.loaded / evento.total * 100)));
    };
    const terminar = (estado: EstadoFoto) => { atualizar(foto.id, estado, estado === "enviada" ? 100 : 0); resolve(); };
    xhr.onload = () => terminar(xhr.status === 201 ? "enviada" : xhr.status >= 400 && xhr.status < 500 ? "erro" : "incerta");
    xhr.onerror = xhr.ontimeout = xhr.onabort = () => terminar("incerta");
    const dados = new FormData();
    dados.set("token", token); dados.set("ordem", String(foto.ordem));
    dados.set("contexto", foto.contexto.trim()); dados.set("foto", foto.arquivo);
    try { xhr.send(dados); } catch { terminar("incerta"); }
  });
}

/** Uploads são sequenciais; o próprio arquivo e slot permanecem estáveis nos retries. */
export async function enviarFotosEmSequencia(fotos: readonly FotoEnvio[], token: string, atualizar: AtualizarFoto): Promise<void> {
  if (!token || fotos.some(f => f.contexto.trim().length < 3 || f.contexto.trim().length > 300)) throw new Error("Descreva o que cada foto mostra antes de enviar.");
  for (const foto of fotos) if (foto.estado !== "enviada") await enviarFoto(foto, token, atualizar);
}

/** O navegador decide a mensagem exibida; o aviso textual na página explica o que se perde. */
export function protegerFotosNaoEnviadas(alvo: EventTarget): () => void {
  const avisar = (evento: Event) => evento.preventDefault();
  alvo.addEventListener("beforeunload", avisar);
  return () => alvo.removeEventListener("beforeunload", avisar);
}
