import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import catalogo from '@/lib/mapa/municipios.json';
import { pontoInterior, lerGeometria, destinoMunicipio, textoPainel } from '@/lib/mapa/geometria';
import { MapaGoias } from './MapaGoias';
const svg=readFileSync('public/mapas/goias-municipios.svg','utf8');
describe('mapa municipal',()=>{
 it('preserva 246 códigos do catálogo e todos têm alvo interior ampliável sem colisão',()=>{
  expect(Buffer.byteLength(svg)).toBeLessThan(30000);
  const paths=[...svg.matchAll(/<path id="(\d+)" d="([^"]+)"/g)];
  expect(paths).toHaveLength(246);expect(new Set(paths.map(p=>p[1]))).toEqual(new Set(catalogo.map(m=>m.id)));
  for(const [,id,d] of paths){const p=pontoInterior(lerGeometria(d));expect(p.raio, id).toBeGreaterThan(0);expect(Number.isFinite(p.x+p.y+p.raio)).toBe(true);}
 });
 it('distingue cobertura, zero e indisponibilidade sem inventar contagem',()=>{
  expect(textoPainel({estado:'indisponivel'})).toBe('Dados indisponíveis. Tente novamente mais tarde.');
  expect(textoPainel({estado:'carregando'})).toContain('Carregando');
  expect(textoPainel({estado:'disponivel',total:0,ativoAcompanhamento:true})).toBe('Ainda não há relatos publicados neste município.');
  expect(textoPainel({estado:'disponivel',total:0,ativoAcompanhamento:false})).toBe('Ainda não acompanhamos este município. Isso não significa que não existam problemas.');
  expect(textoPainel({estado:'disponivel',total:7,ativoAcompanhamento:false})).toContain('7 relatos publicados na plataforma');
  expect(textoPainel({estado:'disponivel',total:7,ativoAcompanhamento:true})).toContain('7 relatos publicados na plataforma');
 });
 it('produz destinos GET e rejeita slug fora do catálogo',()=>{
  expect(destinoMunicipio('/dados','goiania','categoria=saude')).toBe('/dados?categoria=saude&municipio=goiania#territorio');
  expect(destinoMunicipio('/','inexistente')).toBeNull();
 });
 it('renderiza seletor completo e resultado antes do mapa sem depender de JavaScript',()=>{
  const html=renderToStaticMarkup(createElement(MapaGoias,{municipios:catalogo,municipioSelecionado:'goiania',painel:{estado:'indisponivel'}}));
  expect(html).toContain('method="get"');expect(html).toContain('value="goiania" selected=""');
  expect(html.match(/<option /g)).toHaveLength(247);expect(html).toContain('href="/municipios/goiania"');
  expect(html.indexOf('role="status"')).toBeLessThan(html.indexOf('<img '));
  expect(html).toContain('Geometria simplificada');expect(html).not.toContain('tabindex="0"');
 });
});

