"use client";
import { useId, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ranquearMunicipios } from "@/lib/busca/ranquear";
import { descreverResolucao, mensagemErroGps, type CodigoErroGps } from "@/lib/busca/gps";

type Municipio = { slug: string; nome: string };

const controle =
  "min-h-12 rounded-lg border border-borda bg-superficie px-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco disabled:opacity-50";

export function BuscaMunicipio({ municipios }: { municipios: readonly Municipio[] }) {
  const id = useId();
  const router = useRouter();
  const [consulta, setConsulta] = useState("");
  const [ativo, setAtivo] = useState(-1);
  const [aberto, setAberto] = useState(false);
  const [aviso, setAviso] = useState("");
  const [proximo, setProximo] = useState<Municipio | null>(null);
  const [buscandoGps, setBuscandoGps] = useState(false);

  const resultados = useMemo(() => ranquearMunicipios(consulta, municipios), [consulta, municipios]);
  const listaId = `${id}-lista`;
  const mostrar = aberto && resultados.length > 0;
  const opcaoId = (i: number) => `${id}-opcao-${i}`;

  function ir(slug: string) {
    router.push(`/municipios/${slug}`);
  }

  function aoTeclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && resultados.length) {
      e.preventDefault();
      setAberto(true);
      setAtivo((a) => (a + 1) % resultados.length);
    } else if (e.key === "ArrowUp" && resultados.length) {
      e.preventDefault();
      setAberto(true);
      setAtivo((a) => (a <= 0 ? resultados.length - 1 : a - 1));
    } else if (e.key === "Escape") {
      setAberto(false);
      setAtivo(-1);
    } else if (e.key === "Enter" && mostrar && ativo >= 0 && resultados[ativo]) {
      e.preventDefault();
      ir(resultados[ativo].slug);
    }
  }

  function usarLocalizacao() {
    setProximo(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setAviso(mensagemErroGps("indisponivel"));
      return;
    }
    setAviso("Procurando sua localização…");
    setBuscandoGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { resolverGps } = await import("@/lib/mapa/projecao");
          const acao = descreverResolucao(resolverGps(pos.coords.latitude, pos.coords.longitude));
          if (acao.tipo === "ir") {
            setAviso("");
            ir(acao.slug);
          } else if (acao.tipo === "confirmar") {
            setProximo({ slug: acao.slug, nome: acao.nome });
            setAviso("");
          } else {
            setAviso("Sua localização está fora de Goiás. Busque o município pelo nome.");
          }
        } catch {
          setAviso(mensagemErroGps(2));
        } finally {
          setBuscandoGps(false);
        }
      },
      (erro) => {
        const codigo: CodigoErroGps = erro.code === 1 || erro.code === 2 || erro.code === 3 ? erro.code : 2;
        setAviso(mensagemErroGps(codigo));
        setBuscandoGps(false);
      },
      { timeout: 10_000, maximumAge: 0, enableHighAccuracy: false },
    );
  }

  return (
    <div className="grid gap-3">
      <form method="get" action="/buscar" role="search" className="grid gap-2">
        <label htmlFor={`${id}-q`} className="font-semibold">
          Buscar município
        </label>
        <div className="relative">
          <input
            id={`${id}-q`}
            name="q"
            type="search"
            role="combobox"
            autoComplete="off"
            maxLength={80}
            placeholder="Digite o nome da cidade"
            aria-expanded={mostrar}
            aria-autocomplete="list"
            aria-controls={listaId}
            aria-activedescendant={mostrar && ativo >= 0 ? opcaoId(ativo) : undefined}
            value={consulta}
            onChange={(e) => {
              setConsulta(e.target.value);
              setAberto(true);
              setAtivo(-1);
            }}
            onKeyDown={aoTeclar}
            className={`${controle} w-full font-normal`}
          />
          <ul
            id={listaId}
            role="listbox"
            aria-label="Municípios encontrados"
            hidden={!mostrar}
            className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-auto rounded-lg border border-borda bg-superficie shadow-md"
          >
            {mostrar &&
              resultados.map((m, i) => (
                <li
                  key={m.slug}
                  id={opcaoId(i)}
                  role="option"
                  aria-selected={i === ativo}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => ir(m.slug)}
                  className={`flex min-h-12 cursor-pointer items-center px-3 ${i === ativo ? "bg-acao-suave font-semibold" : ""}`}
                >
                  {m.nome}
                </li>
              ))}
          </ul>
        </div>
        <p className="sr-only" aria-live="polite">
          {consulta.trim() ? `${resultados.length} municípios encontrados` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={controle}>
            Buscar
          </button>
          <button type="button" onClick={usarLocalizacao} disabled={buscandoGps} className={controle}>
            Usar minha localização
          </button>
        </div>
      </form>
      <div role="status" className="text-sm">
        {aviso}
        {proximo && (
          <p>
            Município mais próximo: {proximo.nome}{" "}
            <button type="button" onClick={() => ir(proximo.slug)} className={controle}>
              Ir para {proximo.nome}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
