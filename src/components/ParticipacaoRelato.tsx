"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const motivos = [
  ["dado_pessoal", "Dados pessoais"], ["acusacao_sem_base", "Acusação sem base"],
  ["ameaca", "Ameaça"], ["conteudo_ilegal", "Conteúdo ilegal"], ["spam", "Spam"],
  ["duplicado", "Relato duplicado"], ["outro", "Outro motivo"],
];

export function ParticipacaoRelato({ id, afeta }: { id: string; afeta: boolean }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState("");

  async function enviar(rota: "afeta" | "denunciar" | "resposta", dados: Record<string, unknown>) {
    if (ocupado) return;
    setOcupado(true);
    setMensagem("");
    try {
      const resposta = await fetch(`/api/${rota}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ocorrencia_id: id, ...dados }),
      });
      if (resposta.status === 202) {
        setMensagem(rota === "afeta" ? "Confirmação recebida." : "Envio recebido para revisão.");
        if (rota === "afeta") router.refresh();
      } else {
        setMensagem(resposta.status === 429 ? "Muitos envios. Aguarde para tentar novamente." : "Não foi possível concluir o envio. Confira os dados e tente novamente.");
      }
    } catch {
      setMensagem("Não foi possível confirmar o envio. Tente novamente com os mesmos dados.");
    } finally {
      setOcupado(false);
    }
  }

  function enviarFormulario(evento: FormEvent<HTMLFormElement>, rota: "denunciar" | "resposta") {
    evento.preventDefault();
    const campos = new FormData(evento.currentTarget);
    const texto = String(campos.get("texto") ?? "").trim();
    const dados = rota === "denunciar" ? { motivo: campos.get("motivo"), ...(texto ? { texto } : {}) }
      : { vinculo: campos.get("vinculo"), contato: campos.get("contato"), texto };
    void enviar(rota, dados);
  }

  return <div className="space-y-4 rounded-lg border border-borda p-4">
    {afeta && <button type="button" disabled={ocupado} className="min-h-12 underline" onClick={() => void enviar("afeta", {})}>Também me afeta</button>}
    <details>
      <summary className="cursor-pointer py-2 font-semibold">Sinalizar este relato</summary>
      <form method="post" action="/api/denunciar" className="space-y-3" onSubmit={evento => enviarFormulario(evento, "denunciar")}>
        <label className="block">Motivo<select name="motivo" className="ml-2 border" required>{motivos.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}</select></label>
        <label className="block">Complemento opcional<textarea name="texto" maxLength={1000} className="block w-full border" /></label>
        <button type="submit" disabled={ocupado} className="min-h-12 underline">Enviar sinalização</button>
      </form>
    </details>
    <details>
      <summary className="cursor-pointer py-2 font-semibold">Enviar direito de resposta</summary>
      <form method="post" action="/api/resposta" className="space-y-3" onSubmit={evento => enviarFormulario(evento, "resposta")}>
        <label className="block">Vínculo com o relato<input name="vinculo" minLength={2} maxLength={120} required className="block w-full border" /></label>
        <label className="block">Contato privado para revisão<input name="contato" minLength={3} maxLength={254} required className="block w-full border" /></label>
        <label className="block">Resposta<textarea name="texto" minLength={10} maxLength={4000} required className="block w-full border" /></label>
        <button type="submit" disabled={ocupado} className="min-h-12 underline">Enviar para revisão</button>
      </form>
    </details>
    <p role="status">{mensagem}</p>
  </div>;
}
