import { createElement } from 'react';
import { expect,it,vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PainelDados,TabelaDados } from '@/components/TabelaDados';
import PaginaDados from '@/app/dados/page';
import { obterDadosPainel } from './consultas';
vi.mock('next/cache',()=>({cacheLife:vi.fn(),cacheTag:vi.fn()}));
vi.mock('./rest',()=>({consultar:vi.fn()}));
import { consultar } from './rest';
it('SSR fornece caption, cabeçalhos, totais e texto independente de cor',()=>{
 const html=renderToStaticMarkup(createElement(TabelaDados,{titulo:"Categorias",linhas:[{nome:"Saúde",total:3}]}));
 expect(html).toContain('<caption ');expect(html).toContain('scope="col"');expect(html).toContain('scope="row"');expect(html).toContain('Saúde: 3');expect(html).toContain('aria-hidden="true"');
 expect(renderToStaticMarkup(createElement(PainelDados,{linhas:[]}))).toContain('Nenhum relato publicado neste recorte.');
});
it('metodologia precede indicadores e período não sugere backend funcional',()=>{
 const html=renderToStaticMarkup(createElement(PaginaDados,{searchParams:Promise.resolve({})}));
 expect(html.indexOf('Como ler estes números')).toBeGreaterThan(0);
 expect(html).toContain('relatos voluntários');expect(html).toContain('Indicadores oficiais — em preparação');
});
it('filtros GET chegam à view e paginação não trunca nos primeiros 300 grupos',async()=>{
 const linha={id:'00000000-0000-4000-8000-000000000001',municipio_slug:'goiania',municipio_nome:'Goiânia',categoria_slug:'saude',categoria_nome:'Saúde',mes:'2026-01-01',situacao:'registrado',total:1,com_resposta_oficial:0,resolvidas_documentadas:0};
 vi.mocked(consultar).mockResolvedValueOnce(Array.from({length:300},()=>linha)).mockResolvedValueOnce([]);
 expect((await obterDadosPainel({municipio:'goiania',categoria:'saude'})).length).toBe(300);
 expect(consultar).toHaveBeenCalledWith('v_dados_painel',expect.objectContaining({filtros:[['municipio_slug','eq.goiania'],['categoria_slug','eq.saude']]}),expect.anything());
 expect(consultar).toHaveBeenLastCalledWith('v_dados_painel',expect.objectContaining({filtros:expect.arrayContaining([['id',`gt.${linha.id}`]])}),expect.anything());
});


it('periodo inativo com rotulo e formulario GET sem JS',async()=>{const {readFileSync}=await import('node:fs');const pagina=readFileSync('src/app/dados/page.tsx','utf8');expect(pagina).toContain('method="get"');expect(pagina).toContain('<select disabled aria-describedby="periodo-nota">');expect(pagina).toMatch(/Fase 2 . ainda sem backend/);expect(pagina).toContain('name="municipio"');expect(pagina).toContain('name="categoria"');});
