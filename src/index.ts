import { ELexState, ELexControl, LexList, LexListItem } from "./types";
import * as types from "./types";
import { resolveComma, resolveDollar, isEmpty, isString, isOdd } from "./tree";

export type ICirruNode = types.ICirruNode;

type FuncTokenGet = () => string | ELexControl;

let graspeExprs = (pullToken: FuncTokenGet) => {
  let acc: ICirruNode[] = [];
  let pointer = acc;
  let pointerStack = [];
  while (true) {
    let cursor = pullToken();
    // console.log(pointerStack, pointer, cursor);
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
      case ELexControl.close:
        throw new Error("Unexpected close token");
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
      throw new Error(`Unexpected ")"`);
    } else {
      throw new Error(`Unexpected chunk ${JSON.stringify(chunk)}`);
    }
  }
};

let parseIndentation = (buffer: string) => {
  let size = buffer.length;
  if (isOdd(size)) {
    throw new Error(`Invalid indentation size ${size}`);
  }
  return size / 2;
};

let lex = (initialCode: string) => {
  let acc: LexList = [];
  let state = ELexState.indent as ELexState;
  let buffer = "";
  let code = initialCode;

  let pointer = 0;
  let len = code.length;

  while (true) {
    if (pointer >= len) {
      switch (state) {
        case ELexState.space:
          return acc;
        case ELexState.token:
          acc.push(buffer);
          return acc;
        case ELexState.escape:
          throw new Error("Should not be escape");
        case ELexState.indent:
          return acc;
        case ELexState.string:
          throw new Error("Should not be string");
        default:
          console.log(state);
          throw new Error("Unkown state");
      }
    } else {
      let c = code[pointer];
      pointer += 1;
      switch (state) {
        case ELexState.space:
          switch (c) {
            case " ":
              // stay in space, buffer stays empty
              break;
            case "\n":
              state = ELexState.indent;
              break;
            case "(":
              acc.push(ELexControl.open);
              break;
            case ")":
              acc.push(ELexControl.close);
              break;
            case '"':
              state = ELexState.string;
              buffer = "";
              break;
            default:
              state = ELexState.token;
              buffer = c;
              break;
          }
          break;
        case ELexState.token:
          switch (c) {
            case " ":
              acc.push(buffer);
              state = ELexState.space;
              buffer = "";
              break;
            case '"':
              acc.push(buffer);
              state = ELexState.string;
              buffer = "";
              break;
            case "\n":
              acc.push(buffer);
              state = ELexState.indent;
              buffer = "";
              break;
            case "(":
              acc.push(buffer, ELexControl.open);
              state = ELexState.space;
              buffer = "";
              break;
            case ")":
              acc.push(buffer, ELexControl.close);
              state = ELexState.space;
              buffer = "";
              break;
            default:
              buffer = buffer + c;
              break;
          }
          break;
        case ELexState.string:
          switch (c) {
            case '"':
              acc.push(buffer);
              state = ELexState.space;
              buffer = "";
              break;
            case "\\":
              state = ELexState.escape;
              break;
            case "\n":
              throw new Error("Expected newline in string");
            default:
              buffer = buffer + c;
              break;
          }
          break;
        case ELexState.escape:
          switch (c) {
            case '"':
              buffer = buffer + '"';
              break;
            case "'":
              buffer = buffer + "'";
              break;
            case "t":
              buffer = buffer + "\t";
              break;
            case "n":
              buffer = buffer + "\n";
              break;
            case "r":
              buffer = buffer + "\r";
              break;
            case "\\":
              buffer = buffer + "\\";
              break;
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
              buffer = buffer + " ";
              break;
            case "\n":
              buffer = "";
              break;
            case '"':
              acc.push(parseIndentation(buffer));
              state = ELexState.string;
              buffer = "";
              break;
            case "(":
              acc.push(parseIndentation(buffer), ELexControl.open);
              state = ELexState.space;
              buffer = "";
              break;
            default:
              acc.push(parseIndentation(buffer));
              state = ELexState.token;
              buffer = c;
              break;
          }
          break;
        default:
          console.log("Unknown state:", c);
          return acc;
      }
    }
  }
  return acc;
};

let resolveIndentations = (initialTokens: LexList) => {
  let acc: LexList = [];
  let level = 0;
  let tokens: LexList = initialTokens;
  let pointer = 0;
  while (true) {
    if (pointer >= tokens.length) {
      if (isEmpty(acc)) {
        return [];
      } else {
        acc.unshift(ELexControl.open);
        for (let i = 0; i < level; i++) acc.push(ELexControl.close);
        acc.push(ELexControl.close);
        return acc;
      }
    } else {
      let cursor = tokens[pointer];
      if (typeof cursor === "string") {
        acc.push(cursor);
        pointer += 1;
      } else if (cursor === ELexControl.open || cursor === ELexControl.close) {
        acc.push(cursor);
        pointer += 1;
      } else if (typeof cursor === "number") {
        if (cursor > level) {
          let delta = cursor - level;
          for (let i = 0; i < delta; i++) acc.push(ELexControl.open);
          pointer += 1;
          level = cursor;
        } else if (cursor < level) {
          let delta = level - cursor;
          for (let i = 0; i < delta; i++) acc.push(ELexControl.close);
          acc.push(ELexControl.close, ELexControl.open);
          pointer += 1;
          level = cursor;
        } else {
          if (!isEmpty(acc)) {
            acc.push(ELexControl.close, ELexControl.open);
          }
          pointer += 1;
        }
      } else {
        console.log(cursor);
        throw new Error("Unknown token");
      }
    }
  }
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
  let tokens = resolveIndentations(lex(code));
  let pointer = 0;
  let pullToken = () => {
    let c = tokens[pointer];
    pointer += 1;
    return c;
  };
  return resolveComma(resolveDollar(buildExprs(pullToken)));
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
