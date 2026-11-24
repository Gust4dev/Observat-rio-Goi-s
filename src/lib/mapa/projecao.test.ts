import { describe, expect, it } from 'vitest';
import { latLonParaSvg, resolverGps } from './projecao';

const REFERENCIAS = [
  { slug: 'goiania', lat: -16.6869, lon: -49.2648 },
  { slug: 'anapolis', lat: -16.3281, lon: -48.9534 },
  { slug: 'catalao', lat: -18.1656, lon: -47.9446 },
  { slug: 'formosa', lat: -15.5406, lon: -47.3344 },
  { slug: 'rio-verde', lat: -17.7923, lon: -50.9192 },
];

describe('latLonParaSvg', () => {
  it('projeta de forma monotônica: leste aumenta x, norte diminui y', () => {
    const a = latLonParaSvg(-16, -50);
    const b = latLonParaSvg(-17, -49);
    expect(b.x).toBeGreaterThan(a.x);
    expect(b.y).toBeGreaterThan(a.y);
  });
});

describe('resolverGps', () => {
  it.each(REFERENCIAS)('resolve $slug com exato:true', ({ slug, lat, lon }) => {
    const r = resolverGps(lat, lon);
    expect(r).toMatchObject({ slug, exato: true });
  });

  it('resolve cidades extras de validação da calibração', () => {
    const extras = [
      ['aparecida-de-goiania', -16.8198, -49.2469],
      ['luziania', -16.253, -47.95],
      ['itumbiara', -18.4094, -49.2158],
      ['jatai', -17.8814, -51.7144],
      ['porangatu', -13.4394, -49.1494],
      ['posse', -14.0944, -46.3703],
    ] as const;
    for (const [slug, lat, lon] of extras) {
      expect(resolverGps(lat, lon), slug).toMatchObject({ slug, exato: true });
    }
  });

  it('devolve foraDeGoias para Atlântico e Bahia', () => {
    expect(resolverGps(-23.5, -30)).toEqual({ foraDeGoias: true });
    expect(resolverGps(-12.0, -44.0)).toEqual({ foraDeGoias: true });
  });

  it('não lança em entradas inválidas', () => {
    expect(resolverGps(Number.NaN, 0)).toEqual({ foraDeGoias: true });
    expect(resolverGps(Infinity, -49)).toEqual({ foraDeGoias: true });
  });

  it('varredura de grade (inclui bordas compartilhadas) nunca lança e sempre devolve forma válida', () => {
    for (let lat = -19.6; lat <= -12.3; lat += 0.05) {
      for (let lon = -53.3; lon <= -45.8; lon += 0.05) {
        const r = resolverGps(lat, lon);
        expect('foraDeGoias' in r || (typeof r.slug === 'string' && typeof r.exato === 'boolean')).toBe(true);
      }
    }
  });

  it('ponto dentro do bbox mas fora de polígono (Distrito Federal) vira vizinho com exato:false', () => {
    const r = resolverGps(-15.7939, -47.8828);
    expect(r).toMatchObject({ exato: false });
    expect('slug' in r && typeof r.slug).toBe('string');
  });
});
