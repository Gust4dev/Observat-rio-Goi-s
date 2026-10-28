import { expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { z } from 'zod';
import { dadoPainelSchema } from './schemas';
import { idSchema } from './params';
import { montarQuery } from './rest';
it('UUIDs agregadas reais da expressao SQL passam RFC, DTO e cursor em toda a familia',async()=>{
 const sql=readFileSync('db/012_dados_painel.sql','utf8').replaceAll('\r\n','\n');
 const expressao=sql.split('create view public.v_dados_painel as\nselect ')[1].split(' as id,')[0];
 const db=new PGlite();
 try {
 const resultado=await db.query<{id:string}>(`select ${expressao} as id from (select n as municipio_id, 1 as categoria_id, '2026-01-01'::timestamptz as publicado_em, 'registrado'::text as situacao from generate_series(1,100) n) o`);
 expect(resultado.rows).toHaveLength(100);
 for(const {id} of resultado.rows){
  expect(z.uuid().safeParse(id).success).toBe(true);
  expect(dadoPainelSchema.safeParse({id,municipio_slug:'teste',municipio_nome:'Teste',categoria_slug:'saude',categoria_nome:'Saude',mes:'2026-01-01',situacao:'registrado',total:1,com_resposta_oficial:0,resolvidas_documentadas:0}).success).toBe(true);
  expect(montarQuery({select:['id'],filtros:[['id',`gt.${idSchema.parse(id)}`]]}).get('id')).toBe(`gt.${id}`);
 }
 } finally {await db.close()}
},20000);
