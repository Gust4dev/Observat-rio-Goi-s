// Execute on a trusted server. Dry run unless --apply. Never logs paths/secrets.
import { limparImagens } from '../src/lib/registro/limpeza-imagens.mjs';
import { resolveSupabaseKeys } from '../src/lib/supabase-keys.mjs';
try {
 if (process.argv.slice(2).some(arg => arg !== '--apply')) throw Error('Argumento inválido');
 console.log(JSON.stringify(await limparImagens({ base: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', key: resolveSupabaseKeys(process.env).secretKey, apply: process.argv.includes('--apply') })));
} catch { console.error('Limpeza não concluída; repetir no próximo agendamento.'); process.exitCode = 1; }
