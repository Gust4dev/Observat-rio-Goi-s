export type ResultadoLimpeza = { candidates: number; removed: number; dryRun: boolean };
export function limparImagens(config: { base: string; key: string; apply?: boolean; now?: number; fetch?: typeof globalThis.fetch }): Promise<ResultadoLimpeza>;
