import { describe, expect, it } from "vitest";
import { codigoTotp } from "../../../scripts/lib/admin-ficticio.mjs";

describe("RFC 6238 helper", () => {
  it("generates the published SHA-1 six-digit TOTP vector", () => {
    expect(codigoTotp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 59_000)).toBe("287082");
  });
});
