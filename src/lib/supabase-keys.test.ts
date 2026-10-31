import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveSupabaseKeys, supabaseApiHeaders } from "./supabase-keys.mjs";

describe("Supabase key migration", () => {
  it("prefers the explicit public and secret key variables", () => {
    expect(resolveSupabaseKeys({
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_new",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy-public",
      SUPABASE_SECRET_KEY: "sb_secret_new",
      SUPABASE_SERVICE_ROLE_KEY: "legacy-secret",
    })).toEqual({ publicKey: "sb_publishable_new", secretKey: "sb_secret_new" });
  });

  it("keeps legacy environment names as a fallback", () => {
    expect(resolveSupabaseKeys({
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy-public",
      SUPABASE_SERVICE_ROLE_KEY: "legacy-secret",
    })).toEqual({ publicKey: "legacy-public", secretKey: "legacy-secret" });
  });

  it("uses sb_publishable keys only as apikey", () => {
    expect(supabaseApiHeaders("sb_publishable_dummy")).toEqual({ apikey: "sb_publishable_dummy" });
  });

  it("uses sb_secret keys only as apikey", () => {
    expect(supabaseApiHeaders("sb_secret_dummy")).toEqual({ apikey: "sb_secret_dummy" });
  });

  it("preserves an explicit authenticated user JWT as Bearer", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signature";
    expect(supabaseApiHeaders("sb_publishable_dummy", jwt)).toEqual({
      apikey: "sb_publishable_dummy",
      Authorization: `Bearer ${jwt}`,
    });
  });

  it.each(["sb_publishable_attacker", "sb_secret_attacker"])(
    "never sends an API key as Bearer even when passed as userJwt: %s",
    (key) => {
      expect(supabaseApiHeaders("sb_publishable_project", key)).toEqual({
        apikey: "sb_publishable_project",
      });
    },
  );

  it("retains Bearer compatibility only for legacy JWT-formatted keys", () => {
    const legacy = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.signature";
    expect(supabaseApiHeaders(legacy)).toEqual({ apikey: legacy, Authorization: `Bearer ${legacy}` });
    expect(supabaseApiHeaders("not-a-jwt")).toEqual({ apikey: "not-a-jwt" });
  });

  it("keeps the secret variable unprefixed and out of client components", async () => {
    const root = join(process.cwd(), "src");
    const pending = [root];
    while (pending.length) {
      const dir = pending.pop()!;
      for (const entry of await (await import("node:fs/promises")).readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) pending.push(path);
        else if (/\.(?:ts|tsx|js|jsx|mjs)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
          const source = await readFile(path, "utf8");
          if (/^\s*["']use client["']\s*;/m.test(source)) {
            expect(source, path).not.toMatch(/SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY/);
            expect(source, path).not.toMatch(/(?:from\s*["'][^"']*supabase-keys|import\s*["'][^"']*supabase-keys)/);
          }
        }
      }
    }
    const example = await readFile(join(process.cwd(), ".env.example"), "utf8");
    expect(example).not.toMatch(/NEXT_PUBLIC_SUPABASE_(?:SECRET|SERVICE_ROLE)_KEY/);
  });
});
