import * as fs from "fs";
import * as path from "path";
import { parse } from "./index";

// Build a large test input by combining all test files many times
const testFiles = ["demo", "html", "comma", "folding", "indent", "line", "parentheses", "quote", "unfolding", "list-match"];

const testInputs = testFiles.map((name) => {
  // works both from project root (bench.js) and from src/ (bench.ts with ts-node)
  const candidates = [path.join(__dirname, `../test/cirru/${name}.cirru`), path.join(__dirname, `test/cirru/${name}.cirru`)];
  for (const p of candidates) {
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
  }
  throw new Error(`Cannot find ${name}.cirru`);
});

// Concatenate inputs to get a decent-sized payload
const bigInput = Array.from({ length: 20 }, () => testInputs.join("\n\n")).join("\n\n");

console.log(`Input size: ${bigInput.length} chars`);

function bench(label: string, fn: () => void, iterations = 2000) {
  // Warmup
  for (let i = 0; i < 200; i++) fn();

  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) fn();
  const end = process.hrtime.bigint();

  const totalMs = Number(end - start) / 1_000_000;
  const opsPerSec = Math.round((iterations / totalMs) * 1000);
  const msPerOp = (totalMs / iterations).toFixed(3);
  console.log(`${label}: ${opsPerSec.toLocaleString()} ops/sec  (${msPerOp}ms/op, ${iterations} iters, ${totalMs.toFixed(1)}ms total)`);
}

bench("parse(bigInput)", () => {
  parse(bigInput);
});
