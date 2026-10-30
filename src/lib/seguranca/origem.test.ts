import { afterEach, describe, expect, it, vi } from "vitest";
import { mesmaOrigem } from "./origem";

afterEach(() => vi.unstubAllEnvs());

describe("verificação de origem", () => {
  it("aceita origem igual ao host observado pelo servidor", () => {
    vi.stubEnv("VERCEL", "");
    const request = new Request("http://127.0.0.1:4000/api/admin", { headers: { host: "127.0.0.1:4000", origin: "http://127.0.0.1:4000" } });
    expect(mesmaOrigem(request)).toBe(true);
  });

  it("usa os cabeçalhos de origem enviados pela Vercel para a URL pública", () => {
    vi.stubEnv("VERCEL", "1");
    const request = new Request("http://internal.invalid/api/admin", { headers: {
      host: "internal.invalid", "x-forwarded-host": "observatorio.example", "x-forwarded-proto": "https",
      origin: "https://observatorio.example",
    } });
    expect(mesmaOrigem(request)).toBe(true);
    const crossOrigin = new Request(request.url, { headers: { host: "internal.invalid", "x-forwarded-host": "observatorio.example", "x-forwarded-proto": "https", origin: "https://evil.example" } });
    expect(mesmaOrigem(crossOrigin)).toBe(false);
  });

  it("rejeita host encaminhado malformado e origem ausente", () => {
    vi.stubEnv("VERCEL", "1");
    expect(mesmaOrigem(new Request("https://app.example/api/admin", { headers: { origin: "https://app.example", "x-forwarded-host": "evil.example/path", "x-forwarded-proto": "https" } }))).toBe(false);
    expect(mesmaOrigem(new Request("https://app.example/api/admin"))).toBe(false);
  });
});
