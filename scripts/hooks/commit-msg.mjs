import { validarArquivoCommit } from "../validar-commit.mjs";

try {
  validarArquivoCommit(process.argv[2]);
} catch (erro) {
  console.error(`Commit inválido: ${erro.message}`);
  process.exitCode = 1;
}
