import { ELexState, ELexControl } from "./types";
import * as types from "./types";
import { resolveComma, resolveDollar, isOdd, isString } from "./tree";

export type ICirruNode = types.ICirruNode;

type FuncTokenGet = () => string | ELexControl;

let graspeExprs = (pullToken: FuncTokenGet) => {
  let acc: ICirruNode[] = [];
  let pointer = acc;
  let pointerStack = [];
  while (true) {
    let cursor = pullToken();
    switch (cursor) {
      case ELexControl.close:
        if (pointerStack.length === 0) {
          return pointer;
        }
        let collected = pointer;
        pointer = pointerStack.pop();
        pointer.push(collected);
        break;
      case ELexControl.open:
        pointerStack.push(pointer);
        pointer = [];
        break;
      default:
        if (isString(cursor)) {
          pointer.push(cursor);
          break;
        } else {
          console.log(JSON.stringify(cursor));
          throw new Error("Unknown cursor");
        }
    }
  }
};

let buildExprs = (pullToken: FuncTokenGet) => {
  let acc = [];
  while (true) {
    let chunk = pullToken();
    if (chunk === ELexControl.open) {
      let expr = graspeExprs(pullToken);
      acc.push(expr);
      continue;
    } else if (chunk == null) {
      return acc;
    } else if (chunk === ELexControl.close) {
      throw new Error('Unexpected ")"');
    } else {
      throw new Error(`Unexpected chunk ${JSON.stringify(chunk)}`);
    }
  }
};

// Merged lex + resolveIndentations in a single pass.
// - Uses integer indent counter instead of a string buffer (no GC per indent space).
// - Emits open/close tokens for indentation directly, eliminating the intermediate LexList.
// - Token strings extracted with code.slice(start, end) — zero allocation per character.
// - String literals: slice when no escape sequences, fall back to buffer only if escapes appear.
// - Tracks hasDollar / hasComma so the caller can skip tree-transform passes when not needed.
let lexAndResolve = (code: string): { tokens: (string | ELexControl)[]; hasDollar: boolean; hasComma: boolean } => {
  let acc: (string | ELexControl)[] = [];
  let state = ELexState.indent as ELexState;
  let buffer = "";            // only used for string content that contains escape sequences
  let level = 0;
  let indentCount = 0;        // spaces counted while in indent state
  let tokenStart = 0;         // start index in `code` of the current token
  let stringStart = 0;        // start index in `code` of string content (after opening '"')
  let stringHasEscape = false;
  let hasDollar = false;
  let hasComma = false;

  const len = code.length;

  const flushIndent = (newLevel: number) => {
    if (newLevel === level) {
      if (acc.length > 0) acc.push(ELexControl.close, ELexControl.open);
      return;
    }
    if (newLevel > level) {
      const delta = newLevel - level;
      for (let i = 0; i < delta; i++) acc.push(ELexControl.open);
    } else {
      const delta = level - newLevel;
      for (let i = 0; i < delta; i++) acc.push(ELexControl.close);
      acc.push(ELexControl.close, ELexControl.open);
    }
    level = newLevel;
  };

  const pushToken = (tok: string) => {
    acc.push(tok);
    if (tok === "$") hasDollar = true;
    else if (tok === ",") hasComma = true;
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
            acc.push(ELexControl.open);
            break;
          case ")":
            acc.push(ELexControl.close);
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
            pushToken(code.slice(tokenStart, pointer - 1));
            state = ELexState.space;
            break;
          case '"':
            pushToken(code.slice(tokenStart, pointer - 1));
            state = ELexState.string;
            stringStart = pointer;
            stringHasEscape = false;
            buffer = "";
            break;
          case "\n":
            pushToken(code.slice(tokenStart, pointer - 1));
            state = ELexState.indent;
            indentCount = 0;
            break;
          case "(":
            pushToken(code.slice(tokenStart, pointer - 1));
            acc.push(ELexControl.open);
            state = ELexState.space;
            break;
          case ")":
            pushToken(code.slice(tokenStart, pointer - 1));
            acc.push(ELexControl.close);
            state = ELexState.space;
            break;
          default:
            // no-op: position tracked via tokenStart/pointer, no buffer needed
            break;
        }
        break;
      case ELexState.string:
        switch (c) {
          case '"':
            acc.push(stringHasEscape ? buffer : code.slice(stringStart, pointer - 1));
            state = ELexState.space;
            break;
          case "\\":
            if (!stringHasEscape) {
              buffer = code.slice(stringStart, pointer - 1); // collect chars before '\'
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
            acc.push(ELexControl.open);
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
      default:
        console.log("Unknown state:", c);
        return { tokens: acc, hasDollar, hasComma };
    }
  }

  // End of input
  switch (state) {
    case ELexState.token:
      pushToken(code.slice(tokenStart, len));
      break;
    case ELexState.escape:
      throw new Error("Should not be escape");
    case ELexState.string:
      throw new Error("Should not be string");
  }

  if (acc.length === 0) {
    return { tokens: [], hasDollar, hasComma };
  }
  acc.unshift(ELexControl.open);
  for (let i = 0; i < level; i++) acc.push(ELexControl.close);
  acc.push(ELexControl.close);
  return { tokens: acc, hasDollar, hasComma };
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
  const { tokens, hasDollar, hasComma } = lexAndResolve(code);
  let pointer = 0;
  let pullToken = () => {
    let c = tokens[pointer];
    pointer += 1;
    return c;
  };
  let result = buildExprs(pullToken);
  if (hasDollar) result = resolveDollar(result);
  if (hasComma) result = resolveComma(result);
  return result;
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
