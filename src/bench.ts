import * as fs from "fs";
import * as path from "path";
import { parse } from "./index";

let inputCode: string;
let inputLabel: string;

const envFile = process.env.BENCH_FILE;
if (envFile) {
  // Use an externally provided file (path never committed to source)
  inputCode = fs.readFileSync(envFile, "utf8");
  inputLabel = path.basename(envFile);
} else {
  // Fall back to bundled test fixtures
  const testFiles = ["demo", "html", "comma", "folding", "indent", "line", "parentheses", "quote", "unfolding", "list-match"];
  const resolveFixture = (name: string) => {
    const candidates = [path.join(__dirname, `../test/cirru/${name}.cirru`), path.join(__dirname, `test/cirru/${name}.cirru`)];
    for (const p of candidates) {
      if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
    }
    throw new Error(`Cannot find ${name}.cirru`);
  };
  inputCode = Array.from({ length: 20 }, () => testFiles.map(resolveFixture).join("\n\n")).join("\n\n");
  inputLabel = "bundled test fixtures ×20";
}

console.log(`Input: ${inputLabel}  (${inputCode.length.toLocaleString()} chars)`);

function bench(label: string, fn: () => void, iterations = 500) {
  // Warmup
  for (let i = 0; i < 50; i++) fn();

  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) fn();
  const end = process.hrtime.bigint();

  const totalMs = Number(end - start) / 1_000_000;
  const opsPerSec = Math.round((iterations / totalMs) * 1000);
  const msPerOp = (totalMs / iterations).toFixed(3);
  console.log(`${label}: ${opsPerSec.toLocaleString()} ops/sec  (${msPerOp}ms/op, ${iterations} iters, ${totalMs.toFixed(1)}ms total)`);
}

bench("parse", () => {
  parse(inputCode);
});
