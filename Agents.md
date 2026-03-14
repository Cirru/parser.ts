# Agents.md — Development, Testing & Optimization Notes

Quick-reference for contributors and AI agents working on this codebase.

---

## Project Overview

`parser.ts` is a TypeScript implementation of the [Cirru](http://cirru.org/) indentation-sensitive parser.
It converts Cirru source text into a nested `ICirruNode` (string | ICirruNode[]) tree.

Main exports: `parse(code)` and `parseOneLiner(code)` from `src/index.ts`.

---

## Quick Commands

```bash
yarn test          # run all 22 Jest tests
yarn bench         # benchmark on bundled test fixtures (×20, ~16 KB)
BENCH_FILE=/absolute/path/to/large.cirru yarn bench   # benchmark on a real file
yarn compile       # emit lib/ (tsc -p tsconfig-compile.json)
yarn release       # production bundle via vite (rolldown)
```

---

## Package Manager

Yarn Berry 4.x with `nodeLinker: node-modules` (`.yarnrc.yml`).

```bash
corepack enable          # one-time setup per machine
yarn install --immutable # CI; exact lockfile
```

CI workflows (`.github/workflows/`) enable Corepack before running Yarn commands.
Do **not** use `actions/setup-node` with `cache: yarn` here, because its cache probe runs before `corepack enable` and can fail by invoking global Yarn 1 against the project's `packageManager: yarn@4.13.0`.

---

## Testing

- Framework: Jest + `ts-jest`
- Test file: `src/parser.test.ts`
- Fixtures: `test/cirru/*.cirru` (source) + `test/ast/*.json` (expected output)
- Every optimization must keep all **27 tests passing**.

Rules:

- Run `yarn test` before and after any structural change.
- `folded-beginning.cirru` is the trickiest edge case: the file can begin with a blank line and then indented content, so the very first indentation flush must preserve top-level structure instead of introducing an extra sibling boundary.
- Any optimization that touches `$` or `,` semantics must be treated as high-risk and validated against the full fixture suite before considering benchmark wins.
- There are now explicit tree-level equivalence tests for the combined `$`/`,` pass; keep them green before trusting any transform rewrite.

---

## Benchmark Setup

`src/bench.ts` compiles with `tsconfig.bench.json` (target es2022, skipLibCheck, includes node types),
then runs with plain `node`.

```bash
# Benchmark internals
iterations = 500   (with 50 warmup rounds)
BENCH_FILE env var → absolute path, never committed (large real-world file)
fallback           → test/cirru/*.cirru joined ×20 (~16 KB)
```

```bash
# Typical real-world numbers (2026-03, Apple Silicon)
# Small fixtures ×20 (16 KB):  ~5,000 ops/sec  (was ~2,250 at original baseline)
# calcit-core.cirru (244 KB):  ~594 ops/sec   (was ~323 at original baseline)
```

---

## Architecture

```
parse(code)
  └─ lexAndBuild(code)             # single-pass: lex + indent + tree-build + dollar/comma
       stack-based tree builder, no intermediate token array
       → ICirruNode[]
```

### ELexState machine (in `lexAndBuild`)

| State    | Description                           |
| -------- | ------------------------------------- |
| `indent` | counting leading spaces at line start |
| `space`  | between tokens                        |
| `token`  | inside a bare word/symbol             |
| `string` | inside a `"..."` literal              |
| `escape` | after `\` inside a string             |

---

## Optimization History & Techniques

### Round 1 — in `lexAndResolve` (commit f9781a8)

- **Eliminate array destructuring** in hot loop: `[acc, state, buffer] = [acc, ...]` → direct assignments.
- **No template literals** in hot path: `\`${buffer}${c}\``→`buffer + c`.
- **Inline `repeat()`/`pushToList()`** → bare `for` loops.
- **Cache `code.length`** into `len` before the loop.
- Result: +34% on small input.

### Round 2 — merged passes (commit c441701)

- **Single-pass lex + indent resolution**: eliminated the intermediate `LexList` array that the old `lex()` → `resolveIndentations()` two-step created.
- **Integer indent counter**: `indentCount++` instead of string `" ".repeat(n)` comparison.
- **`hasDollar` / `hasComma` flags**: skip expensive tree-transform passes entirely when the source contains neither `$` nor `,` tokens.

### Round 3 — slice-based token extraction (commit c441701)

- **`code.slice(tokenStart, pointer - 1)`** at token boundaries instead of `buffer + c` per character. Eliminates O(token_length) string allocations per token.
- **`stringStart` + `stringHasEscape` flag**: string literals use `code.slice(stringStart, pointer - 1)` when no backslash is encountered; only fall back to char-by-char `buffer +` when an escape sequence appears.

### Round 4 — no-slice tree helpers (commit f7e4fb9)

- **`dollarHelper(after, start)`**: pass array + start index instead of `after.slice(pointer + 1)` on every `$` token.
- **`commaHelper(after, start)`**: same — avoids `cursor.slice(1)` allocation per comma-head expression.
- Result: +12% on 244 KB real-world file (353 → 395 ops/sec).

### Round 5 — eliminate `tokens[]` array (commit 80ced1b)

- **`lexAndBuild(code)`**: merged `lexAndResolve` + `buildExprs` + `graspeExprs` into a single stack-based pass.
- No `tokens[]` array, no `pointer` index, no `pullToken` closure — all eliminated.
- Stack model: `result[]` (top-level output), `stack[]` (in-progress arrays), `current` (innermost).
- `emitOpen()` / `emitClose()` / `emitToken()` are the only three operations; called directly from the character loop.
- Outer `open` is emitted lazily on first non-whitespace (`first` flag), so end-of-input needs no `acc.unshift()`.
- Result: +16% small (3,118 → 3,615 ops/sec), **+21% large (395 → 479 ops/sec)**.
- **Total from original baseline**: +61% (16 KB) / +48% (244 KB).

### Round 6 — numeric dispatch in hot lexer loop

- **`code.charCodeAt(pointer++)`** replaced `code[pointer++]` in `lexAndBuild()`.
- Hot-path state dispatch now compares integer char codes for space/newline/quote/parens/backslash instead of 1-char strings.
- `code.slice(...)` is still used for token extraction, so token contents and edge-case behavior stay unchanged.
- Escape handling still reconstructs exact characters, but only on the rare escape path.
- Result: **3,615 → 4,013 ops/sec** on 16 KB fixtures, **479 → 496 ops/sec** on 244 KB real-world input.

### Round 7 — combine `$` and `,` tree transforms

- Added **`resolveDollarComma(xs)`** in `src/tree.ts` as a single recursive pass intended to be equivalent to `resolveComma(resolveDollar(xs))`.
- Parser now uses the combined transform whenever either `hasDollar` or `hasComma` is present.
- Added focused equivalence tests for empty input, comma expansion, dollar nesting, unfolding-style mixed input, and nested-array-head behavior.
- This is a semantics-sensitive optimization, so the extra tests are part of the safety net, not just regression coverage.
- Result: **4,013 → 5,058 ops/sec** on 16 KB fixtures, **496 → 594 ops/sec** on 244 KB real-world input.

---

## V8 Profiling

```bash
./node_modules/.bin/tsc -p tsconfig.bench.json --outDir .bench
node --prof .bench/bench.js
node --prof-process isolate-*.log 2>/dev/null | head -100
rm -f isolate-*.log .bench/
```

Latest profile findings (2026-03, after round 7, large real-world file):
| Function | JS ticks |
|------------------|-----------|
| `lexAndBuild` | 58.3% |
| `dollarCommaHelper` | 12.7% |

Interpretation:

- The combined tree pass paid off: the two separate helpers disappeared from the profile and total GC dropped again.
- `lexAndBuild()` is now even more clearly the dominant pure-JS hotspot.
- Future lexer work should still prefer local, semantics-preserving changes unless a larger rewrite can be defended with tests first.

---

## Known Bottlenecks / Future Work

1. **`lexAndBuild()` dispatch cost** — now ~58% of JS ticks on the large-file profile. This is the clearest remaining hotspot.
2. **Character extraction on rare paths** — escape handling still uses `code[pointer - 1]`; tiny wins may still exist, but they should stay local and preserve exact string semantics.
3. **Array pre-sizing / pooling** — possible, but lower priority than lexer work and easier to get wrong for little gain.

---

## File Map

| File                    | Purpose                                                                 |
| ----------------------- | ----------------------------------------------------------------------- |
| `src/index.ts`          | Parser entry point; `lexAndBuild`, `parse`, `parseOneLiner`             |
| `src/tree.ts`           | Tree helpers: `resolveDollar`, `resolveComma`, utilities                |
| `src/types.ts`          | `ELexState`, `ELexControl`, `ICirruNode`                                |
| `src/parser.test.ts`    | All 22 tests                                                            |
| `src/bench.ts`          | Benchmark script                                                        |
| `tsconfig.bench.json`   | Separate tsconfig for bench (es2022, node types)                        |
| `tsconfig-compile.json` | Library build config                                                    |
| `test/cirru/*.cirru`    | Test input fixtures                                                     |
| `test/ast/*.json`       | Expected AST outputs                                                    |
| `lib/`                  | Compiled library output (generated; not committed—run `yarn compile`)   |
