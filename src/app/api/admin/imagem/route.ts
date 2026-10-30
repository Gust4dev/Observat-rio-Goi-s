import { createHash } from "node:crypto";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { fotosHabilitadas } from "@/lib/registro/servidor";
import { entradaHttp, respostaPrivada } from "@/lib/registro/http";
import { ErroRegistro, respostaErro } from "@/lib/registro/erros";
import { exigirStaging } from "@/lib/registro/staging";
import { caminhoImagemValido } from "@/lib/registro/caminho-imagem.mjs";
import { mesmaOrigem } from "@/lib/seguranca/origem";

const checklist=z.object({rosto:z.boolean(),menor:z.boolean(),placa:z.boolean(),numero_residencia:z.boolean(),documento:z.boolean(),agressao:z.boolean()}).strict();
const entrada=z.object({imagem_id:z.uuid(),acao:z.enum(["aprovar","remover"]),descricao_publica:z.string().trim().min(1).max(300).optional(),motivo:z.string().trim().min(1).max(1000).optional(),checklist}).strict().refine(v=>v.acao==="aprovar"?Boolean(v.descricao_publica)&&Object.values(v.checklist).every(x=>!x):Boolean(v.motivo));
class FalhaAdmin extends Error { constructor(readonly status:number){super("Não foi possível concluir a moderação.");} }
function credencial(request:Request){
 const bearer=request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i)?.[1];
 if(bearer)return bearer;
 const cookie=request.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith("og_admin_access_token="))?.slice(22);
 if(!cookie)throw new FalhaAdmin(401);
 try{return decodeURIComponent(cookie);}catch{throw new FalhaAdmin(401);}
}
/** Decodifica claims somente depois de Auth validar o mesmo access token. */
function exigirMfa(jwt:string,usuarioId:string){
 try{
  const partes=jwt.split(".");
  if(partes.length!==3||jwt.length>16384||!/^[-_a-zA-Z0-9]+$/.test(partes[1]))throw new Error();
  const claims=z.object({sub:z.uuid(),aal:z.literal("aal2")}).parse(JSON.parse(Buffer.from(partes[1],"base64url").toString("utf8")));
  if(claims.sub!==usuarioId)throw new Error();
 }catch{throw new FalhaAdmin(403);}
}
function configuracao(){
 const base=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL??"");const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(base.protocol!=="https:"||base.username||base.password||base.pathname!=="/"||base.search||base.hash||!anon)throw new FalhaAdmin(503);
 return {base:base.origin,anon};
}
async function chamar(base:string,path:string,headers:Record<string,string>,init:RequestInit={}){
 return fetch(`${base}${path}`,{...init,headers:{...headers,...init.headers},cache:"no-store",signal:AbortSignal.timeout(15000)});
}
export async function POST(request:Request){
 try{
  if(!request.headers.get("authorization")?.trim().toLowerCase().startsWith("bearer ")&&(!mesmaOrigem(request)||request.headers.get("X-Observatorio-CSRF")!=="1"))throw new FalhaAdmin(403);
  if(!fotosHabilitadas())throw new ErroRegistro("indisponivel");exigirStaging(request);
  const jwt=credencial(request);const config=configuracao();const usuarioHeaders={apikey:config.anon,Authorization:`Bearer ${jwt}`,"Content-Type":"application/json"};
  const auth=await chamar(config.base,"/auth/v1/user",usuarioHeaders);
  const usuario=auth.ok?z.object({id:z.uuid()}).safeParse(await auth.json()):null;if(!usuario?.success)throw new FalhaAdmin(401);
  exigirMfa(jwt,usuario.data.id);
  const papeis=await chamar(config.base,`/rest/v1/administradores?${new URLSearchParams({select:"user_id,papel,ativo",user_id:`eq.${usuario.data.id}`})}`,usuarioHeaders);
  const admins=papeis.ok?z.array(z.object({user_id:z.uuid(),papel:z.enum(["moderador","gestor","superadmin"]),ativo:z.boolean()})).safeParse(await papeis.json()):null;
  if(!admins?.success||!admins.data.some(a=>a.user_id===usuario.data.id&&a.ativo))throw new FalhaAdmin(403);
  const dados=await entradaHttp(request,entrada);
  const rpc=async(nome:string,body:unknown)=>{const r=await chamar(config.base,`/rest/v1/rpc/${nome}`,usuarioHeaders,{method:"POST",body:JSON.stringify(body)});if(!r.ok)throw new FalhaAdmin(r.status===409?409:503);return r;};
  const preparacao=await rpc("admin_preparar_imagem",{p_imagem_id:dados.imagem_id,p_acao:dados.acao});
  const linhas=z.array(z.object({out_operacao:z.uuid(),out_caminho:z.string(),out_moderacao:z.string()})).length(1).safeParse(await preparacao.json());
  if(!linhas.success||!caminhoImagemValido(linhas.data[0].out_caminho))throw new FalhaAdmin(503);
  const operacao=linhas.data[0];const chave=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!chave)throw new FalhaAdmin(503);
  const storageHeaders={apikey:chave,Authorization:`Bearer ${chave}`};const publico=`/storage/v1/object/imagens-publicas/${dados.imagem_id}.jpg`;const privado=`/storage/v1/object/imagens-quarentena/${operacao.out_caminho}`;
  const apagar=async(path:string)=>{const r=await chamar(config.base,path,storageHeaders,{method:"DELETE"});if(!r.ok&&r.status!==404)throw new FalhaAdmin(503);};
  const abandonar=()=>rpc("admin_abandonar_imagem",{p_imagem_id:dados.imagem_id,p_operacao:operacao.out_operacao});
  let copiada=false;
  try{
   if(dados.acao==="aprovar"){
    const origem=await chamar(config.base,privado,storageHeaders);if(!origem.ok)throw new FalhaAdmin(503);const bytes=await origem.arrayBuffer();if(bytes.byteLength>2097152)throw new FalhaAdmin(503);
    copiada=true;const copia=await chamar(config.base,publico,{...storageHeaders,"Content-Type":"image/jpeg","x-upsert":"false"},{method:"POST",body:new Uint8Array(bytes)});
    let duplicada=copia.status===409;
    if(copia.status===400){const erro=await copia.json().catch(()=>null);duplicada=erro?.error==="Duplicate"||erro?.statusCode==="409";}
    if(duplicada){const existente=await chamar(config.base,publico,storageHeaders);if(!existente.ok)throw new FalhaAdmin(503);const atual=await existente.arrayBuffer();if(atual.byteLength>2097152||createHash("sha256").update(Buffer.from(bytes)).digest("hex")!==createHash("sha256").update(Buffer.from(atual)).digest("hex"))throw new FalhaAdmin(409);}
    else if(!copia.ok)throw new FalhaAdmin(503);
    copiada=true;
   }
   await rpc("admin_moderar_imagem",{p_imagem_id:dados.imagem_id,p_acao:dados.acao,p_motivo:dados.motivo??null,p_descricao_publica:dados.descricao_publica??null,p_checklist:dados.checklist,p_operacao:operacao.out_operacao});
   revalidateTag("problemas",{expire:0});
   if(dados.acao==="remover")await Promise.all([apagar(publico),apagar(privado)]);
   return respostaPrivada({confirmacao:dados.acao==="aprovar"?"Foto aprovada.":"Foto removida."});
  }catch(erro){
   // A resposta da RPC pode ter se perdido depois do commit. Nunca apagar uma aprovação confirmada.
   if(copiada){
    try{const atual=await chamar(config.base,`/rest/v1/imagens?${new URLSearchParams({select:"moderacao,operacao_admin_id",id:`eq.${dados.imagem_id}`})}`,usuarioHeaders);const estado=atual.ok?z.array(z.object({moderacao:z.string(),operacao_admin_id:z.uuid().nullable()})).length(1).safeParse(await atual.json()):null;
     if(estado?.success&&estado.data[0].moderacao!=="publicado"&&estado.data[0].operacao_admin_id===operacao.out_operacao){await apagar(publico);await abandonar();}
    }catch{/* lease expira; reconciliação conserva a linha e apaga cópia órfã depois da margem. */}
   }else if(dados.acao==="remover"){
    // Remoção é confirmada no banco antes do Storage. Se a resposta se perder,
    // reconciliar pelo estado persistido e concluir a purga nesta mesma chamada.
    try{
     const atual=await chamar(config.base,`/rest/v1/imagens?${new URLSearchParams({select:"moderacao",id:`eq.${dados.imagem_id}`})}`,usuarioHeaders);
     const estado=atual.ok?z.array(z.object({moderacao:z.string()})).length(1).safeParse(await atual.json()):null;
     if(estado?.success&&estado.data[0].moderacao==="removido"){
      revalidateTag("problemas",{expire:0});await Promise.all([apagar(publico),apagar(privado)]);
      return respostaPrivada({confirmacao:"Foto removida."});
     }
     await abandonar().catch(()=>{});
    }catch{/* O estado/Storage será reconciliado na repetição administrativa ou pela limpeza. */}
   }else await abandonar().catch(()=>{});
   throw erro;
  }
 }catch(erro){if(erro instanceof FalhaAdmin)return respostaPrivada({erro:{codigo:"moderacao_indisponivel",mensagem:erro.message}},erro.status);return respostaErro(erro);}
}





