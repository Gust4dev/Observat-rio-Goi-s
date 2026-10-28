export type ConfigFotosStaging={base:string;anon:string;service:string;app?:string;adminToken?:string;hmac?:string;basic?:string};
export function verificarStagingFotos(config:ConfigFotosStaging,transportar?:typeof fetch):Promise<{schema:boolean}>;
export function executarCicloFotos(config:ConfigFotosStaging,transportar?:typeof fetch):Promise<{ciclo:boolean}>;
