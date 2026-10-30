import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { rotasContrato } from "./index";

const root = process.cwd();
const api = join(root, "src", "app", "api");
const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function routes(dir = api): Array<[string, string]> {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return routes(path);
    if (entry.name !== "route.ts") return [];
    const route = relative(api, dir).split(sep).filter(Boolean).map((part) => /^\[.+\]$/.test(part) ? `{${part.slice(1, -1)}}` : part);
    const source = readFileSync(path, "utf8");
    return methods.filter((method) => new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`).test(source)).map((method) => [method, `/api/${route.join("/")}`] as [string, string]);
  });
}

describe("sincronização do inventário de contratos HTTP", () => {
  it("enumera exatamente todos os métodos exportados pelos Route Handlers", () => {
    const expected = [...rotasContrato].map(([method, route]) => `${method} ${route}`).sort();
    const actual = routes().map(([method, route]) => `${method} ${route}`).sort();
    expect(actual).toEqual(expected);
  });
});
