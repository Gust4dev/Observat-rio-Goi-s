import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';

const origem = 'https://hvekgzxuciyewtybwads.supabase.co';
const colunas = {
  v_ocorrencias_publicas: ['id', 'protocolo', 'municipio_id', 'municipio_nome', 'municipio_slug', 'categoria_id', 'categoria_nome', 'categoria_slug', 'titulo', 'descricao', 'situacao', 'verificado', 'publicado_em', 'atualizado_em', 'confirmacoes_total', 'tem_resposta_oficial'],
  v_imagens_publicas: ['id', 'ocorrencia_id', 'ordem', 'descricao_publica'],
  v_atualizacoes_publicas: ['id', 'ocorrencia_id', 'tipo', 'situacao_nova', 'texto', 'evidencia', 'criado_em'],
  v_respostas_publicas: ['id', 'ocorrencia_id', 'autor_vinculo', 'texto', 'publicada_em'],
  v_indicadores_gerais: ['total_ocorrencias', 'municipios_com_registros', 'com_resposta_oficial', 'resolvidas_documentadas'],
  v_indicadores_municipio_categoria: ['municipio_slug', 'municipio_nome', 'categoria_slug', 'categoria_nome', 'total'],
  v_indicadores_mensal: ['mes', 'total'],
  v_indicadores_situacao: ['situacao', 'total'],
  v_dados_painel: ['id', 'municipio_slug', 'municipio_nome', 'categoria_slug', 'categoria_nome', 'mes', 'situacao', 'total', 'com_resposta_oficial', 'resolvidas_documentadas'],
};

function documento() {
  return {
    swagger: '2.0',
    paths: Object.fromEntries(Object.keys(colunas).map((view) => [`/${view}`, { get: { responses: { 200: { description: 'OK', schema: { type: 'array', items: { $ref: `#/definitions/${view}` } } } } } }])),
    definitions: Object.fromEntries(Object.entries(colunas).map(([view, nomes]) => [view, { type: 'object', properties: Object.fromEntries(nomes.map((nome) => [nome, { type: 'string' }])) }])),
  };
}

function executar({ schema = documento(), statusSchema = 200, url = origem, linhas = false, falhaRede = false, chaveNova = 'sb_publishable_TEST_NEW', chaveLegada = 'sb_publishable_TEST_OLD' } = {}) {
  const preload = `
    const schema = ${JSON.stringify(schema)};
    const chamadas = [];
    process.loadEnvFile = () => {};
    globalThis.fetch = async (input, init = {}) => {
      const url = new URL(input);
      chamadas.push({ url: String(url), method: init.method, body: init.body, redirect: init.redirect, headers: init.headers });
      if (${falhaRede}) throw new Error('RAW_ERROR_SECRET https://private.invalid/token');
      if (url.pathname === '/rest/v1/') return Response.json(schema, { status: ${statusSchema} });
      if (url.searchParams.get('select') === 'caminho_storage') return Response.json({ code: '42703' }, { status: 400 });
      return Response.json(${linhas} ? [{ marcador_privado: 'ROW_SECRET_MARKER' }] : []);
    };
    process.on('exit', () => console.log('__CHAMADAS__' + JSON.stringify(chamadas)));
  `;
  const resultado = spawnSync(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(preload)}`, 'scripts/contrato-staging.mjs'], {
    cwd: process.cwd(), encoding: 'utf8',
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: chaveNova, NEXT_PUBLIC_SUPABASE_ANON_KEY: chaveLegada, CONTRATO_ALVO: 'outro-projeto', CONTRATO_APP_URL: 'https://app.invalid', ACESSO_STAGING_USUARIO: 'USER_SECRET', ACESSO_STAGING_SENHA: 'PASSWORD_SECRET' },
  });
  const linhasSaida = resultado.stdout.split('\n');
  const observadas = linhasSaida.find((linha) => linha.startsWith('__CHAMADAS__'));
  return { status: resultado.status, chamadas: JSON.parse(observadas?.slice('__CHAMADAS__'.length) ?? '[]'), saida: linhasSaida.filter((linha) => !linha.startsWith('__CHAMADAS__')).join('\n') + resultado.stderr };
}

describe('contrato de staging somente leitura', () => {
  it('prefere a variável nova e não envia uma publishable key como Bearer', () => {
    const resultado = executar({ chaveNova: 'sb_publishable_NEW_MARKER', chaveLegada: 'sb_publishable_OLD_MARKER' });
    expect(resultado.status).toBe(0);
    expect(resultado.chamadas.every((chamada) => chamada.headers.apikey === 'sb_publishable_NEW_MARKER')).toBe(true);
    expect(resultado.chamadas.every((chamada) => !Object.hasOwn(chamada.headers, 'Authorization'))).toBe(true);
  });

  it('executa o comando inteiro com GET sem corpo e confere todas as colunas sem buscar linhas', () => {
    const resultado = executar();
    expect(resultado.status).toBe(0);
    expect(resultado.saida).toContain('CONTRATO OK');
    expect(resultado.chamadas).toHaveLength(12);
    for (const chamada of resultado.chamadas) {
      const url = new URL(chamada.url);
      expect(url.origin).toBe(origem);
      expect(chamada.method).toBe('GET');
      expect(chamada).not.toHaveProperty('body');
      expect(chamada.redirect).toBe('error');
      if (url.pathname !== '/rest/v1/') expect(url.searchParams.get('limit')).toBe('0');
    }
    expect(resultado.saida).not.toMatch(/TEST_KEY_SECRET|USER_SECRET|PASSWORD_SECRET|ROW_SECRET_MARKER/);
  });

  it('relata contrato público parcial quando OpenAPI é inacessível e as sondas públicas passam', () => {
    const resultado = executar({ schema: { message: 'Secret API key required' }, statusSchema: 401 });
    expect(resultado.status).toBe(0);
    expect(resultado.saida).toContain('CONTRATO PÚBLICO PARCIAL');
    expect(resultado.saida).toContain('colunas extras não foram verificadas');
    expect(resultado.saida).not.toContain('CONTRATO OK');
    for (const [view, esperadas] of Object.entries(colunas)) {
      const consulta = resultado.chamadas.find((chamada) => new URL(chamada.url).pathname === `/rest/v1/${view}`);
      const url = new URL(consulta.url);
      expect(url.searchParams.get('select')).toBe(esperadas.join(','));
      expect(url.searchParams.get('limit')).toBe('0');
      expect(resultado.saida).toContain(`${view}: consulta GET sem linhas permitida`);
    }
    expect(resultado.saida).toContain('v_imagens_publicas: caminho_storage inexistente');
  });

  it('reprova sondas públicas com linhas mesmo quando OpenAPI é inacessível', () => {
    const resultado = executar({ statusSchema: 401, linhas: true });
    expect(resultado.status).not.toBe(0);
    expect(resultado.saida).not.toContain('CONTRATO PÚBLICO PARCIAL');
    expect(resultado.saida).not.toContain('CONTRATO OK');
  });

  it.each([
    'https://outro-projeto.supabase.co',
    `${origem}.evil.invalid`,
    `http://${new URL(origem).hostname}`,
    `${origem}/rest/v1`,
    `${origem}?alvo=staging`,
    `${origem}#fragmento`,
    `https://usuario:senha@${new URL(origem).hostname}`,
    `${origem}:8443`,
    'não-é-url',
  ])('recusa alvo inválido sem tráfego: %s', (url) => {
    const resultado = executar({ url });
    expect(resultado.status).not.toBe(0);
    expect(resultado.chamadas).toEqual([]);
    expect(resultado.saida).not.toContain(url);
  });

  it.each(['extra', 'ausente', 'view ausente', 'sem propriedades', 'referência externa', 'malformado'])('não aprova metadados %s', (caso) => {
    const schema = documento();
    if (caso === 'extra') schema.definitions.v_imagens_publicas.properties.segredo = { type: 'string' };
    if (caso === 'ausente') delete schema.definitions.v_imagens_publicas.properties.descricao_publica;
    if (caso === 'view ausente') delete schema.paths['/v_imagens_publicas'];
    if (caso === 'sem propriedades') delete schema.definitions.v_imagens_publicas.properties;
    if (caso === 'referência externa') schema.paths['/v_imagens_publicas'].get.responses[200].schema.items.$ref = 'https://externo.invalid/schema';
    const resultado = executar({ schema: caso === 'malformado' ? null : schema });
    expect(resultado.status).not.toBe(0);
    expect(resultado.saida).not.toContain('CONTRATO OK');
    expect(resultado.chamadas.every((chamada) => new URL(chamada.url).origin === origem)).toBe(true);
  });

  it('rejeita respostas com linhas sem revelar seu conteúdo', () => {
    const resultado = executar({ linhas: true });
    expect(resultado.status).not.toBe(0);
    expect(resultado.saida).not.toContain('ROW_SECRET_MARKER');
    expect(resultado.saida).not.toContain('CONTRATO OK');
  });

  it('encerra falhas de rede sem imprimir erros brutos ou credenciais', () => {
    const resultado = executar({ falhaRede: true });
    expect(resultado.status).not.toBe(0);
    expect(resultado.saida).not.toMatch(/RAW_ERROR_SECRET|private\.invalid|TEST_KEY_SECRET/);
    expect(resultado.saida).not.toContain('CONTRATO OK');
  });
});
