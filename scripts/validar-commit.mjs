import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const titulo = /^(feat|fix|revert|refactor|chore|docs): (\S.*)$/u;

// Valida a estrutura; equivalência da tradução e particípios exigem leitura humana.
export function validarCommit(mensagem) {
  const linhas = mensagem.replace(/\r\n/g, "\n").trim().split("\n");
  const separadores = linhas.flatMap((linha, indice) => linha === "EN" ? [indice] : []);
  if (separadores.length !== 1) {
    throw new Error("A mensagem deve conter exatamente uma linha EN isolada.");
  }

  const separador = separadores[0];
  const blocos = [linhas.slice(0, separador), linhas.slice(separador + 1)];
  const resultados = blocos.map((bloco, indice) => {
    while (bloco[0] === "") bloco.shift();
    while (bloco.at(-1) === "") bloco.pop();
    const cabecalho = titulo.exec(bloco[0] ?? "");
    if (!cabecalho) {
      throw new Error(`Bloco ${indice + 1}: use um tipo permitido em minúsculas, sem escopo, seguido de ': ' e título.`);
    }
    if (bloco.some((linha) => /\.\s*$/u.test(linha))) {
      throw new Error(`Bloco ${indice + 1}: títulos e bullets não podem terminar com ponto.`);
    }
    const bullets = bloco.slice(1);
    if (bullets.length === 0 || bullets.some((linha) => !/^- \S.*$/u.test(linha))) {
      throw new Error(`Bloco ${indice + 1}: inclua ao menos um bullet, iniciado por '- ', sem outras linhas.`);
    }
    return { tipo: cabecalho[1], quantidade: bullets.length };
  });

  if (resultados[0].tipo !== resultados[1].tipo) {
    throw new Error("Os blocos PT e EN devem usar o mesmo tipo.");
  }
  if (resultados[0].quantidade !== resultados[1].quantidade) {
    throw new Error("Os blocos PT e EN devem ter a mesma quantidade de bullets.");
  }
}

export function validarArquivoCommit(caminho) {
  if (!caminho) throw new Error("Informe o caminho do arquivo da mensagem de commit.");
  validarCommit(new TextDecoder("utf-8", { fatal: true }).decode(readFileSync(caminho)));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    validarArquivoCommit(process.argv[2]);
  } catch (erro) {
    console.error(`Commit inválido: ${erro.message}`);
    process.exitCode = 1;
  }
}
