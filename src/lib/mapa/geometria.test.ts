import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import catalogo from './municipios.json';
import { textoPainel } from './geometria';

describe('geometria e painel do município', () => {
  it('o SVG de origem preserva os 246 códigos do catálogo e continua leve', () => {
    const svg = readFileSync('public/mapas/goias-municipios.svg', 'utf8');
    expect(Buffer.byteLength(svg)).toBeLessThan(30000);
    const ids = [...svg.matchAll(/<path id="(\d+)" d="([^"]+)"/g)].map((p) => p[1]);
    expect(ids).toHaveLength(246);
    expect(new Set(ids)).toEqual(new Set(catalogo.map((m) => m.id)));
  });

  it('distingue cobertura, zero e indisponibilidade sem inventar contagem', () => {
    expect(textoPainel({ estado: 'indisponivel' })).toBe('Dados indisponíveis. Tente novamente mais tarde.');
    expect(textoPainel({ estado: 'carregando' })).toContain('Carregando');
    expect(textoPainel({ estado: 'disponivel', total: 0, ativoAcompanhamento: true })).toBe('Não há dados agregados exibíveis para este município.');
    expect(textoPainel({ estado: 'disponivel', total: 0, ativoAcompanhamento: false })).toBe('Ainda não acompanhamos este município. Isso não significa que não existam problemas.');
    expect(textoPainel({ estado: 'disponivel', total: 7, ativoAcompanhamento: false })).toContain('7 relatos nos indicadores públicos');
    expect(textoPainel({ estado: 'disponivel', total: 7, ativoAcompanhamento: true })).toContain('7 relatos nos indicadores públicos');
  });
});
