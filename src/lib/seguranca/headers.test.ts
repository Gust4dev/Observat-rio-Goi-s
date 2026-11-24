import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";

describe("Permissions-Policy", () => {
  it("permite geolocalização só na própria origem e mantém o resto bloqueado", async () => {
    const regras = await nextConfig.headers!();
    const base = regras.find((r) => r.source === "/:path*")!;
    const valor = base.headers.find((h) => h.key === "Permissions-Policy")!.value;

    expect(valor).toContain("geolocation=(self)");
    expect(valor).not.toContain("geolocation=()");
    for (const bloqueado of ["camera=()", "microphone=()", "payment=()", "usb=()"]) {
      expect(valor).toContain(bloqueado);
    }
  });
});
