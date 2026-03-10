import { ELexState } from "./types";
import * as types from "./types";
import { resolveComma, resolveDollar, isOdd } from "./tree";

export type ICirruNode = types.ICirruNode;

// Single-pass lex + build: eliminates the intermediate tokens[] array entirely.
// The lexer drives a stack-based tree builder directly — no token buffer, no pullToken closure.
//
// Stack model:
//   result[]    — top-level expressions being collected
//   stack[]     — in-progress arrays at deeper nesting (from indent or '(')
//   current     — innermost array currently being populated; null when between top-level exprs
//
// emitOpen()   → push current onto stack, start a fresh array as current
//               (or, if current is null, start the first/next top-level expression)
// emitClose()  → complete current array; if stack is empty push to result, else push to parent
// emitToken()  → append a string leaf to current
//
// "first" tracks whether emitOpen() has been called for the outermost wrapper yet.
// The original code used acc.unshift(open) + trailing closes; here we emit that open
// lazily on the first non-whitespace character so we avoid any end-of-input special case.
let lexAndBuild = (code: string): ICirruNode[] => {
  const result: ICirruNode[] = [];
  const stack: ICirruNode[][] = [];
  let current: ICirruNode[] | null = null;
  let hasDollar = false;
  let hasComma = false;

  let state = ELexState.indent as ELexState;
  let buffer = "";            // string content when escape sequences appear
  let level = 0;
  let indentCount = 0;
  let tokenStart = 0;
  let stringStart = 0;
  let stringHasEscape = false;
  // Whether we've emitted the very first emitOpen() (the outer wrapper)
  let first = true;

  const len = code.length;

  const emitOpen = () => {
    if (current !== null) stack.push(current);
    current = [];
  };

  const emitClose = () => {
    const completed = current!;
    if (stack.length === 0) {
      result.push(completed);
      current = null;
    } else {
      current = stack.pop()!;
      current.push(completed);
    }
  };

  const emitToken = (tok: string) => {
    (current as ICirruNode[]).push(tok);
    if (tok === "$") hasDollar = true;
    else if (tok === ",") hasComma = true;
  };

  // Called whenever a new line's first non-whitespace character is encountered.
  // newLevel = indentCount >> 1 (already validated as even before calling).
  // On the very first call: lazily emit the outer open, then any extra opens for depth.
  // Subsequent calls: emit close/open boundaries as the indent level changes.
  const flushIndent = (newLevel: number) => {
    if (first) {
      first = false;
      emitOpen(); // outer wrapper open (replaces acc.unshift at end of original)
      for (let i = 0; i < newLevel; i++) emitOpen();
      level = newLevel;
      return;
    }
    if (newLevel === level) {
      emitClose(); emitOpen(); // sibling expression boundary
      return;
    }
    if (newLevel > level) {
      for (let i = 0; i < newLevel - level; i++) emitOpen();
    } else {
      for (let i = 0; i < level - newLevel; i++) emitClose();
      emitClose(); emitOpen();
    }
    level = newLevel;
  };

  let pointer = 0;
  while (pointer < len) {
    const c = code[pointer++];
    switch (state) {
      case ELexState.space:
        switch (c) {
          case " ":
            break;
          case "\n":
            state = ELexState.indent;
            indentCount = 0;
            break;
          case "(":
            emitOpen();
            break;
          case ")":
            emitClose();
            break;
          case '"':
            state = ELexState.string;
            stringStart = pointer;
            stringHasEscape = false;
            buffer = "";
            break;
          default:
            state = ELexState.token;
            tokenStart = pointer - 1;
            break;
        }
        break;
      case ELexState.token:
        switch (c) {
          case " ":
            emitToken(code.slice(tokenStart, pointer - 1));
            state = ELexState.space;
            break;
          case '"':
            emitToken(code.slice(tokenStart, pointer - 1));
            state = ELexState.string;
            stringStart = pointer;
            stringHasEscape = false;
            buffer = "";
            break;
          case "\n":
            emitToken(code.slice(tokenStart, pointer - 1));
            state = ELexState.indent;
            indentCount = 0;
            break;
          case "(":
            emitToken(code.slice(tokenStart, pointer - 1));
            emitOpen();
            state = ELexState.space;
            break;
          case ")":
            emitToken(code.slice(tokenStart, pointer - 1));
            emitClose();
            state = ELexState.space;
            break;
          default:
            break;
        }
        break;
      case ELexState.string:
        switch (c) {
          case '"':
            emitToken(stringHasEscape ? buffer : code.slice(stringStart, pointer - 1));
            state = ELexState.space;
            break;
          case "\\":
            if (!stringHasEscape) {
              buffer = code.slice(stringStart, pointer - 1);
              stringHasEscape = true;
            }
            state = ELexState.escape;
            break;
          case "\n":
            throw new Error("Expected newline in string");
          default:
            if (stringHasEscape) buffer = buffer + c;
            break;
        }
        break;
      case ELexState.escape:
        switch (c) {
          case '"':  buffer = buffer + '"';  break;
          case "'":  buffer = buffer + "'";  break;
          case "t":  buffer = buffer + "\t"; break;
          case "n":  buffer = buffer + "\n"; break;
          case "r":  buffer = buffer + "\r"; break;
          case "\\":  buffer = buffer + "\\"; break;
          case "u":
            console.warn(`unicode escaping not supported yet, ${code.slice(pointer - 1, pointer + 10)}...`);
            buffer = buffer + "\\u";
            break;
          default:
            throw new Error(`Unknown \\${c} in escape`);
        }
        state = ELexState.string;
        break;
      case ELexState.indent:
        switch (c) {
          case " ":
            indentCount++;
            break;
          case "\n":
            indentCount = 0;
            break;
          case '"':
            if (isOdd(indentCount)) throw new Error(`Invalid indentation size ${indentCount}`);
            flushIndent(indentCount >> 1);
            state = ELexState.string;
            stringStart = pointer;
            stringHasEscape = false;
            buffer = "";
            indentCount = 0;
            break;
          case "(":
            if (isOdd(indentCount)) throw new Error(`Invalid indentation size ${indentCount}`);
            flushIndent(indentCount >> 1);
            emitOpen();
            state = ELexState.space;
            indentCount = 0;
            break;
          default:
            if (isOdd(indentCount)) throw new Error(`Invalid indentation size ${indentCount}`);
            flushIndent(indentCount >> 1);
            state = ELexState.token;
            tokenStart = pointer - 1;
            indentCount = 0;
            break;
        }
        break;
    }
  }

  // Flush any token still in progress at end of input
  if (state === ELexState.token) {
    emitToken(code.slice(tokenStart, len));
  } else if (state === ELexState.escape) {
    throw new Error("Should not be escape");
  } else if (state === ELexState.string) {
    throw new Error("Should not be string");
  }

  if (first) return []; // no content was seen

  // Close remaining open levels (mirrors the original: level closes + 1 final close)
  for (let i = 0; i < level; i++) emitClose();
  emitClose();

  let ret: ICirruNode[] = result;
  if (hasDollar) ret = resolveDollar(ret);
  if (hasComma) ret = resolveComma(ret);
  return ret;
};

/**
 * Parse Cirru code into an abstract syntax tree (AST).
 * Handles indentation-based syntax and returns an array of expressions.
 *
 * @param code - Cirru source code string to parse
 * @returns Array of parsed expressions (ICirruNode[])
 * @example
 * ```typescript
 * parse("defn square (x)\n  * x x")
 * // Returns: [["defn", "square", ["x"], ["*", "x", "x"]]]
 * ```
 */
export let parse = (code: string) => {
  return lexAndBuild(code);
};


/**
 * Parse a single Cirru expression from a one-liner code string.
 * Throws an error if the code contains zero or multiple expressions.
 *
 * @param code - Cirru source code string containing exactly one expression
 * @returns Single parsed expression (ICirruNode)
 * @throws {Error} If the code doesn't contain exactly one expression
 * @example
 * ```typescript
 * parseOneLiner("add 1 2")
 * // Returns: ["add", "1", "2"]
 *
 * parseOneLiner("(add 1 2)")
 * // Returns: ["add", "1", "2"]
 * ```
 */
export let parseOneLiner = (code: string) => {
  let result = parse(code);
  if (result.length !== 1) {
    throw new Error(`Expected single expression, got ${result.length} expressions`);
  }
  return result[0];
};
