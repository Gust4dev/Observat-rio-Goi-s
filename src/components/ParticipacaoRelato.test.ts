import { Children, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ParticipacaoRelato } from "./ParticipacaoRelato";

const hooks = vi.hoisted(() => ({ slots: [] as unknown[], posicao: 0, refresh: vi.fn() }));

// O Vitest do projeto roda em Node, sem DOM. Mantemos os hooks entre
// renderizações para dirigir os handlers reais e renderizar a saída com React.
vi.mock("react", async importar => ({
  ...await importar<typeof import("react")>(),
  useState<T>(inicial: T) {
    const posicao = hooks.posicao++;
    if (!(posicao in hooks.slots)) hooks.slots[posicao] = inicial;
    return [hooks.slots[posicao], (valor: T) => { hooks.slots[posicao] = valor; }];
  },
  useRef<T>(inicial: T) {
    const posicao = hooks.posicao++;
    if (!(posicao in hooks.slots)) hooks.slots[posicao] = { current: inicial };
    return hooks.slots[posicao];
  },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: hooks.refresh }) }));

type Elemento = { children?: ReactNode; disabled?: boolean; onClick?: () => void };

function botaoAfeta(arvore: ReactNode): Elemento | undefined {
  for (const no of Children.toArray(arvore)) {
    if (!isValidElement<Elemento>(no)) continue;
    if (no.type === "button" && no.props.children === "Também me afeta") return no.props;
    const botao = botaoAfeta(no.props.children);
    if (botao) return botao;
  }
}

function renderizar(totalInicial: number) {
  hooks.posicao = 0;
  const arvore = ParticipacaoRelato({ id: "relato-ficticio", afeta: true, totalInicial });
  const botao = botaoAfeta(arvore);
  if (!botao?.onClick) throw new Error("Botão Também me afeta ausente");
  return { html: renderToStaticMarkup(arvore), clicar: botao.onClick, desabilitado: botao.disabled };
}

describe("Contagem de participação no detalhe", () => {
  beforeEach(() => {
    hooks.slots.length = 0;
    hooks.refresh.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("confirma o envio sem inventar incremento e exibe o total canônico após refresh", async () => {
    const resposta = Promise.withResolvers<Response>();
    const post = vi.fn(() => resposta.promise);
    vi.stubGlobal("fetch", post);
    const inicial = renderizar(3);
    expect(inicial.html).toContain("Também me afeta: 3.");

    inicial.clicar();
    inicial.clicar();
    expect(post).toHaveBeenCalledTimes(1);
    expect(renderizar(3).desabilitado).toBe(true);
    resposta.resolve(Response.json({ confirmacao: "Confirmação recebida." }, { status: 202 }));
    await vi.waitFor(() => expect(renderizar(3).html).toContain("Confirmação recebida."));
    expect(renderizar(3).html).toContain("Também me afeta: 3.");
    expect(hooks.refresh).toHaveBeenCalledTimes(1);

    inicial.clicar();
    expect(post).toHaveBeenCalledTimes(1);
    expect(renderizar(3).desabilitado).toBe(true);
    expect(renderizar(4).html).toContain("Também me afeta: 4.");
  });

  it("permite repetir após falha e mantém o total se a confirmação já foi registrada", async () => {
    const post = vi.fn()
      .mockRejectedValueOnce(new Error("resposta perdida"))
      .mockResolvedValueOnce(Response.json({ confirmacao: "Confirmação recebida." }, { status: 202 }));
    vi.stubGlobal("fetch", post);

    renderizar(7).clicar();
    await vi.waitFor(() => expect(renderizar(7).desabilitado).toBe(false));
    expect(renderizar(7).html).toContain("Também me afeta: 7.");
    renderizar(7).clicar();
    await vi.waitFor(() => expect(hooks.refresh).toHaveBeenCalledTimes(1));
    expect(renderizar(7).html).toContain("Também me afeta: 7.");
    expect(renderizar(8).html).toContain("Também me afeta: 8.");
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("permite repetir se a resposta 202 não comprovar o resultado", async () => {
    const post = vi.fn()
      .mockResolvedValueOnce(Response.json({}, { status: 202 }))
      .mockResolvedValueOnce(Response.json({ confirmacao: "Confirmação recebida." }, { status: 202 }));
    vi.stubGlobal("fetch", post);

    renderizar(7).clicar();
    await vi.waitFor(() => expect(renderizar(7).html).toContain("Não foi possível confirmar o envio."));
    expect(renderizar(7).desabilitado).toBe(false);
    expect(renderizar(7).html).toContain("Também me afeta: 7.");
    expect(hooks.refresh).not.toHaveBeenCalled();
    renderizar(7).clicar();
    await vi.waitFor(() => expect(hooks.refresh).toHaveBeenCalledTimes(1));
    expect(renderizar(7).html).toContain("Também me afeta: 7.");
    expect(post).toHaveBeenCalledTimes(2);
  });
});
