import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { supabaseApiHeaders } from '../../src/lib/supabase-keys.mjs';
import { limparImagens } from '../../src/lib/registro/limpeza-imagens.mjs';
const REF = 'hvekgzxuciyewtybwads';
const COLUNAS = 'id,ocorrencia_id,ordem,descricao_publica';
const checklist = { rosto:false, menor:false, placa:false, numero_residencia:false, documento:false, agressao:false };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function headers(key) { return { ...supabaseApiHeaders(key), 'Content-Type':'application/json' }; }
function repetirFalhaDeConexao(transportar) {
 return async (input, init={}) => {
  let ultimo;
  const metodo=(init.method??'GET').toUpperCase();
  for(let tentativa=0;tentativa<3;tentativa++){
   try{return await transportar(input,init);}catch(error){
    ultimo=error;
    const causa=error&&typeof error==='object'&&'cause'in error?error.cause:undefined;
    const antesDeConectar=causa&&typeof causa==='object'&&'code'in causa&&['EADDRINUSE','ECONNREFUSED'].includes(String(causa.code));
    if(tentativa===2||(metodo!=='GET'&&metodo!=='HEAD'&&!antesDeConectar))throw error;
    await new Promise(resolve=>setTimeout(resolve,300*(tentativa+1)));
   }
  }
  throw ultimo;
 };
}
/** Read-only: no fixture is created until every schema probe succeeds. */
export async function verificarStagingFotos(config, transportar=globalThis.fetch) {
 transportar=repetirFalhaDeConexao(transportar);
 let base; try { base=new URL(config.base); } catch { throw Error('Alvo não é o staging conhecido.'); }
 if(base.origin!==`https://${REF}.supabase.co`||base.pathname!=='/'||base.search||base.hash||base.username||base.password)throw Error('Alvo não é o staging conhecido.');
 if(!config.anon||!config.service)throw Error('Credenciais de staging ausentes.');
 const get=(path,key)=>transportar(`${base.origin}/rest/v1/${path}`,{headers:headers(key),signal:AbortSignal.timeout(15000)});
 const view=await get(`v_imagens_publicas?select=${COLUNAS}&limit=0`,config.anon);
 const schema=await get('imagens?select=hash_entrada,descricao_publica,operacao_admin_id,operacao_admin_ate&limit=0',config.service);
 if(!view.ok||!schema.ok)throw Error('Staging sem contrato M4: aplicar/verificar migrações 014/015/016 antes de qualquer escrita.');
 const privado=await get('v_imagens_publicas?select=caminho_storage&limit=0',config.anon);
 if(privado.ok)throw Error('Staging expõe caminho_storage na view pública.');
 const erro=await privado.json().catch(()=>null);
 if(!['42703','PGRST204'].includes(erro?.code))throw Error('Não foi possível comprovar remoção de caminho_storage.');
 return { schema:true };
}

export async function executarCicloFotos(config, transportar=globalThis.fetch) {
 transportar=repetirFalhaDeConexao(transportar);
 await verificarStagingFotos(config,transportar);
 config={...config,base:new URL(config.base).origin};
 if(!config.app||!config.adminToken||!config.hmac)throw Error('Ciclo bloqueado: configurar FOTOS_STAGING_APP_URL, FOTOS_STAGING_ADMIN_TOKEN (AAL2) e HMAC_SEGREDO do app.');
 let app;try{app=new URL(config.app);}catch{throw Error('URL do app inválida.');}
 if(app.username||app.password||app.search||app.hash||app.pathname!=='/'||(app.protocol!=='https:'&&!(app.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(app.hostname))))throw Error('URL do app inválida.');
 const adminHeaders={...headers(config.anon),Authorization:`Bearer ${config.adminToken}`};
 const auth=await transportar(`${config.base}/auth/v1/user`,{headers:adminHeaders});
 const user=auth.ok?await auth.json():null;let claims;
 try{claims=JSON.parse(Buffer.from(config.adminToken.split('.')[1],'base64url').toString());}catch{throw Error('Sessão administrativa inválida.');}
 if(!user?.id||claims.sub!==user.id||claims.aal!=='aal2')throw Error('Sessão administrativa exige MFA AAL2.');
 const api=async(path,body,key=config.service)=>{
  const r=await transportar(`${config.base}/rest/v1/${path}`,{method:body===undefined?'GET':'POST',headers:key===config.adminToken?adminHeaders:headers(key),...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error(`Falha no contrato do ciclo (${r.status}).`);return r.status===204?null:r.json();
 };
 const acesso=config.basic?{Authorization:`Basic ${config.basic}`}:{ };
 const appHeaders={...acesso,Origin:app.origin};
 const admin=async(body)=>{const r=await transportar(`${app.origin}/api/admin/imagem`,{method:'POST',headers:{...appHeaders,'Content-Type':'application/json','X-Observatorio-CSRF':'1',Cookie:`og_admin_access_token=${encodeURIComponent(config.adminToken)}`},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(`Moderação HTTP falhou (${r.status}).`);};
 const token=randomBytes(32).toString('base64url'), tokenHash=hash(token), tokenBytea=`\\x${tokenHash}`;
 const identidade=createHmac('sha256',config.hmac).update(`foto:${tokenHash}`).digest('hex');
 let ocorrencia, imagem, etapa='preparação';const publicos=new Set();const privados=new Set();let cleanupFalhou=false;
 async function listarPrivados(){
  const r=await transportar(`${config.base}/storage/v1/object/list/imagens-quarentena`,{method:'POST',headers:headers(config.service),body:JSON.stringify({prefix:`${identidade}/1`,limit:100,offset:0})});
  if(!r.ok)throw Error('Falha ao conferir objetos de teste.');const rows=await r.json();if(!Array.isArray(rows))throw Error('Lista inválida.');
  for(const row of rows)if(row.id&&/^[a-f0-9]{64}\.jpg$/.test(row.name))privados.add(`${identidade}/1/${row.name}`);
 }
 async function removerObjeto(bucket,caminho){const r=await transportar(`${config.base}/storage/v1/object/${bucket}`,{method:'DELETE',headers:headers(config.service),body:JSON.stringify({prefixes:[caminho]})});if(!r.ok)throw Error('Falha na limpeza do teste.');}
 try{
  etapa='referências públicas';
  const [mun]=await api('municipios?select=id&limit=1',undefined,config.anon),[cat]=await api('categorias?select=id&limit=1',undefined,config.anon);
  etapa='registro fictício da foto';
  const [registro]=await api('rpc/registrar_ocorrencia',{p_municipio_id:mun.id,p_categoria_id:cat.id,p_titulo:'[TESTE FICTÍCIO M4] Foto de pavimento',p_descricao:'Relato inteiramente fictício criado pelo teste de integração M4.',p_anonimo:true,p_nome:null,p_whatsapp:null,p_consentimento:false,p_consentimento_versao:null,p_token_hash:tokenBytea,p_moderacao:'pendente',p_retencao_dias:null,p_chave_idempotencia:randomUUID(),p_origem_hash:null});
  ocorrencia=registro.out_id;
  etapa='aprovação inicial';
  await api('rpc/admin_moderar_ocorrencia',{p_id:ocorrencia,p_acao:'aprovar',p_motivo:'Teste fictício M4'},config.adminToken);
  const jpeg=await sharp({create:{width:20,height:20,channels:3,background:'red'}}).jpeg().toBuffer();
  async function upload(bytes,contexto){const form=new FormData();form.set('token',token);form.set('ordem','1');form.set('contexto',contexto);form.set('foto',new File([bytes],'sintetica.jpg',{type:'image/jpeg'}));return transportar(`${app.origin}/api/imagem`,{method:'POST',headers:appHeaders,body:form,signal:AbortSignal.timeout(60000)});}
  etapa='upload da foto';
  const uploadInicial=await upload(jpeg,'Pavimento sintético vermelho');
  if(uploadInicial.status!==201){const erro=await uploadInicial.clone().json().catch(()=>null);throw Error(`Upload de teste falhou (${uploadInicial.status}${typeof erro?.erro?.codigo==='string'?`, ${erro.erro.codigo}`:''}).`);}
  const rows=await api(`imagens?select=id,caminho_storage&ocorrencia_id=eq.${ocorrencia}`,undefined,config.adminToken);
  if(rows.length!==1)throw Error('Upload não criou vínculo único.');imagem=rows[0].id;publicos.add(`${imagem}.jpg`);privados.add(rows[0].caminho_storage);
  if((await upload(jpeg,'Contexto sintético alterado')).status!==201)throw Error('Retry não foi idempotente.');
  const outro=await sharp({create:{width:20,height:20,channels:3,background:'blue'}}).jpeg().toBuffer();if((await upload(outro,'Outra foto sintética')).status!==409)throw Error('Slot ocupado não foi recusado.');
  etapa='aprovação da foto';
  await admin({imagem_id:imagem,acao:'aprovar',descricao_publica:'Pavimento sintético vermelho, sem pessoas.',checklist});
  const visiveis=await api(`v_imagens_publicas?select=${COLUNAS}&id=eq.${imagem}`,undefined,config.anon);if(visiveis.length!==1||visiveis[0].descricao_publica!=='Pavimento sintético vermelho, sem pessoas.')throw Error('Foto aprovada não está pública com alt revisado.');
  const pagina=await transportar(`${app.origin}/problema/${ocorrencia}`,{headers:acesso});if(!pagina.ok||!(await pagina.text()).includes('Pavimento sintético vermelho, sem pessoas.'))throw Error('Página pública não exibe alt revisado.');
  const foto=await transportar(`${config.base}/storage/v1/object/public/imagens-publicas/${imagem}.jpg`);if(!foto.ok)throw Error('Cópia pública indisponível.');
  etapa='remoção da foto';
  await admin({imagem_id:imagem,acao:'remover',motivo:'Retirada do teste fictício M4',checklist});
  if((await api(`v_imagens_publicas?select=id&id=eq.${imagem}`,undefined,config.anon)).length)throw Error('Foto removida permanece na view.');
  // Exercise the real cleanup routine with a unique test-only prefix; no unrelated object is eligible.
  etapa='limpeza de órfão';
  const orfao=`${identidade}/1/${'f'.repeat(64)}.jpg`;privados.add(orfao);
  const criado=await transportar(`${config.base}/storage/v1/object/imagens-quarentena/${orfao}`,{method:'POST',headers:{...headers(config.service),'Content-Type':'image/jpeg','x-upsert':'false'},body:jpeg});if(!criado.ok)throw Error('Fixture órfã não criada.');
  const restrito=async(input,init)=>{const r=await transportar(input,init);const url=new URL(input);if(!url.pathname.includes('/object/list/'))return r;const rows=await r.json();const prefix=JSON.parse(init.body).prefix;return Response.json(rows.filter(row=>url.pathname.endsWith('imagens-publicas')?publicos.has(row.name):prefix===''?row.name===identidade:true));};
  await limparImagens({base:config.base,key:config.service,apply:true,now:Date.now()+25*3600000,fetch:restrito});
  etapa='verificação final do Storage';
  return { ciclo:true };
 }catch(error){
  const causa=error instanceof Error?error.message:'falha';
  throw new Error(`Etapa de fotos ${etapa}: ${causa}`);
 }finally{
  try{await listarPrivados();}catch{cleanupFalhou=true;}
  for(const caminho of privados)try{await removerObjeto('imagens-quarentena',caminho);}catch{cleanupFalhou=true;}
  for(const caminho of publicos)try{await removerObjeto('imagens-publicas',caminho);}catch{cleanupFalhou=true;}
  if(ocorrencia)try{await api('rpc/solicitar_exclusao_por_token',{p_token_hash:tokenBytea,p_apagar_conteudo:true});}catch{cleanupFalhou=true;}
  for(const [bucket,caminhos] of [['imagens-quarentena',privados],['imagens-publicas',publicos]])for(const caminho of caminhos){try{
   const partes=caminho.split('/'),nome=partes.pop();
   const r=await transportar(`${config.base}/storage/v1/object/list/${bucket}`,{method:'POST',headers:headers(config.service),body:JSON.stringify({prefix:partes.join('/'),search:nome,limit:1000,offset:0})});
   if(!r.ok)throw Error();const rows=await r.json();if(!Array.isArray(rows)||rows.some(row=>row.name===nome&&row.id))cleanupFalhou=true;
  }catch{cleanupFalhou=true;}}
  if(cleanupFalhou)throw Error('Limpeza do teste não foi comprovada; investigar antes de repetir.');
 }
}
