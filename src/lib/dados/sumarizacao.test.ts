import { expect, it } from 'vitest';
import { sumarizarDados } from './sumarizacao';
import { dadoPainelSchema } from './schemas';
const base = {id:'00000000-0000-4000-8000-000000000001',municipio_slug:'goiania',municipio_nome:'Goiânia',categoria_slug:'saude',categoria_nome:'Saúde',mes:'2026-01-01',situacao:'registrado' as const,total:1,com_resposta_oficial:0,resolvidas_documentadas:0};
it('soma apenas flags documentais verificadas e estados ativos; totais das tabelas coincidem',()=>{
 const r=sumarizarDados([base,{...base,id:'00000000-0000-4000-8000-000000000002',situacao:'resolvido',resolvidas_documentadas:1,com_resposta_oficial:1},{...base,situacao:'resolvido'},{...base,situacao:'encerrado_sem_solucao'}]);
 expect(r.indicadores).toEqual({total:4,municipios:1,respostas:1,documentadas:1,acompanhamento:1});
 for(const tabela of [r.categorias,r.municipios,r.meses,r.situacoes]) expect(tabela.reduce((s,l)=>s+l.total,0)).toBe(4);
});
it('zero é zero, sem tabelas inventadas',()=>{const r=sumarizarDados([]);expect(Object.values(r.indicadores)).toEqual([0,0,0,0,0]);expect(r.meses).toEqual([])});
it('valida todos os campos vindos da view',()=>{expect(dadoPainelSchema.safeParse({...base,resolvidas_documentadas:'sim'}).success).toBe(false)});
it('preenche lacuna mensal com zero sem alterar o total',()=>{
 const r=sumarizarDados([base,{...base,mes:'2026-03-01'}]);
 expect(r.meses).toEqual([{nome:'2026-01-01',total:1},{nome:'2026-02-01',total:0},{nome:'2026-03-01',total:1}]);
});
