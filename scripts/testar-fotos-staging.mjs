import { verificarStagingFotos, executarCicloFotos } from './lib/fotos-staging.mjs';
import { resolveSupabaseKeys } from '../src/lib/supabase-keys.mjs';
try{process.loadEnvFile(new URL('../.env.local',import.meta.url));}catch{/* environment can be supplied by the runner */}
const keys=resolveSupabaseKeys(process.env);
const config={base:process.env.NEXT_PUBLIC_SUPABASE_URL??'',anon:keys.publicKey,service:keys.secretKey,app:process.env.FOTOS_STAGING_APP_URL,adminToken:process.env.FOTOS_STAGING_ADMIN_TOKEN,hmac:process.env.HMAC_SEGREDO,basic:process.env.ACESSO_STAGING_USUARIO&&process.env.ACESSO_STAGING_SENHA?Buffer.from(`${process.env.ACESSO_STAGING_USUARIO}:${process.env.ACESSO_STAGING_SENHA}`).toString('base64'):undefined};
try{
 if(process.argv.slice(2).some(arg=>arg!=='--verificar'))throw Error('Argumento inválido.');
 const resultado=process.argv.includes('--verificar')?await verificarStagingFotos(config):await executarCicloFotos(config);
 console.log(JSON.stringify(resultado));
}catch(erro){console.error(erro instanceof Error?erro.message:'Teste não concluído.');process.exitCode=1;}
