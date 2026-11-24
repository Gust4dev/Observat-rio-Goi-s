import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import catalogo from '@/lib/mapa/municipios.json';
import { pontoInterior, lerGeometria, destinoMunicipio, textoPainel, estadoVisualMunicipio } from '@/lib/mapa/geometria';
import { MapaGoias } from './MapaGoias';
vi.mock('next/navigation',()=>({useRouter:()=>({push:()=>{}})}));
const svg=readFileSync('public/mapas/goias-municipios.svg','utf8');
describe('mapa municipal',()=>{
 it('dá precedência à seleção e à navegação por teclado no polígono sob o ponteiro', () => {
  expect(estadoVisualMunicipio('goiania', 'goiania', 'goiania', 'goiania')).toBe('selecionado');
  expect(estadoVisualMunicipio('goiania', 'anapolis', 'goiania', 'goiania')).toBe('candidato');
  expect(estadoVisualMunicipio('goiania', 'anapolis', 'trindade', 'goiania')).toBe('hover');
  expect(estadoVisualMunicipio('goiania', 'anapolis', 'trindade', undefined)).toBe('padrao');
 });
 it('preserva 246 códigos do catálogo e todos têm alvo interior ampliável sem colisão',()=>{
  expect(Buffer.byteLength(svg)).toBeLessThan(30000);
  const paths=[...svg.matchAll(/<path id="(\d+)" d="([^"]+)"/g)];
  expect(paths).toHaveLength(246);expect(new Set(paths.map(p=>p[1]))).toEqual(new Set(catalogo.map(m=>m.id)));
  for(const [,id,d] of paths){const p=pontoInterior(lerGeometria(d));expect(p.raio, id).toBeGreaterThan(0);expect(Number.isFinite(p.x+p.y+p.raio)).toBe(true);}
 });
 it('distingue cobertura, zero e indisponibilidade sem inventar contagem',()=>{
  expect(textoPainel({estado:'indisponivel'})).toBe('Dados indisponíveis. Tente novamente mais tarde.');
  expect(textoPainel({estado:'carregando'})).toContain('Carregando');
  expect(textoPainel({estado:'disponivel',total:0,ativoAcompanhamento:true})).toBe('Não há dados agregados exibíveis para este município.');
  expect(textoPainel({estado:'disponivel',total:0,ativoAcompanhamento:false})).toBe('Ainda não acompanhamos este município. Isso não significa que não existam problemas.');
  expect(textoPainel({estado:'disponivel',total:7,ativoAcompanhamento:false})).toContain('7 relatos nos indicadores públicos');
  expect(textoPainel({estado:'disponivel',total:7,ativoAcompanhamento:true})).toContain('7 relatos nos indicadores públicos');
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

 it('SSR: instruções, controles rotulados, parâmetros mantidos e sem estado antigo',()=>{
  const html=renderToStaticMarkup(createElement(MapaGoias,{municipios:catalogo,municipioSelecionado:'goiania',painel:{estado:'disponivel',total:3,ativoAcompanhamento:true},parametros:{categoria:'saude',municipio:'x'}}));
  expect(html).toContain('Toque em um município para selecioná-lo. Use + e − para aproximar ou arraste para explorar. O seletor também permite escolher pelo nome.');
  for(const nome of ['Ampliar mapa','Reduzir mapa','Mostrar Goiás inteiro'])expect(html).toContain(`aria-label="${nome}"`);
  expect(html).toContain('<input type="hidden" name="categoria" value="saude"/>');expect(html).not.toContain('name="municipio" value="x"');
  expect(html).toContain('3 relatos nos indicadores públicos');expect(html).toContain('Goiânia');
  expect(html).not.toContain('touch-action');expect(html).not.toContain('requestSubmit');
 });
 it('SSR: sem município inicial não há seleção nem contagem', ()=>{
  const html=renderToStaticMarkup(createElement(MapaGoias,{municipios:catalogo}));
  expect(html.match(/<option /g)).toHaveLength(247);expect(html.match(/selected=""/g)).toHaveLength(1);expect(html).toContain('<option value="" selected="">');expect(html).toContain('Escolha um município para consultar');
 });
 it('apresenta promessa, seletor, ações e resumo antes do mapa no hero', ()=>{
  const html=renderToStaticMarkup(createElement(MapaGoias,{municipios:catalogo,variante:'hero'}));
  expect(html).toContain('aria-label="Painel de seleção do município"');
  expect(html).toContain('aria-label="Mapa interativo de Goiás"');
  expect(html).toContain('246 municípios');
  expect(html).toContain('Passe para ver · clique para selecionar');
  expect(html).toContain('Toque para selecionar');
  expect(html).toContain('Goiás, visto de perto.');
  expect(html.match(/aria-label="Mapa interativo de Goiás"/g)).toHaveLength(1);
  expect(html.indexOf('Goiás, visto de perto.')).toBeLessThan(html.indexOf('<select '));
  expect(html.indexOf('<select ')).toBeLessThan(html.indexOf('Registrar um problema'));
  expect(html.indexOf('Registrar um problema')).toBeLessThan(html.indexOf('Ver relatos em Goiás'));
  expect(html.indexOf('Ver relatos em Goiás')).toBeLessThan(html.indexOf('aria-label="Resumo do município"'));
  expect(html.indexOf('aria-label="Resumo do município"')).toBeLessThan(html.indexOf('aria-label="Mapa interativo de Goiás"'));
  expect(html).not.toContain('Resumo da malha municipal');
 });
});
