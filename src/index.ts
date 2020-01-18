import { ICirruNode, ELexState, ELexControl, LexList, LexListItem } from "./types";
import { conj, addToList, resolveComma, resolveDollar, isEmpty, isString, isNumber, isOdd, isArray } from "./tree";

type FuncTokenGet = () => string | ELexControl;

let graspeExprs = (acc: ICirruNode[], pullToken: FuncTokenGet) => {
  let cursor = pullToken();
  switch (cursor) {
    case ELexControl.close:
      return acc;
    case ELexControl.open:
      let current = graspeExprs([], pullToken);
      return graspeExprs(conj(acc, current), pullToken);
    case ELexControl.close:
      throw new Error("Unexpected close token");
    default:
      if (isString(cursor)) {
        return graspeExprs(conj(acc, cursor), pullToken);
      } else {
        console.log(cursor);
        throw new Error("Unknown cursor");
      }
  }
};

let buildExprs = (pullToken: FuncTokenGet) => {
  let acc = [];
  while (true) {
    let chunk = pullToken();
    if (chunk === ELexControl.open) {
      let expr = graspeExprs([], pullToken);
      acc.push(expr);
      continue;
    } else if (chunk == null) {
      return acc;
    } else {
      console.log(chunk);
      throw new Error("Unknown chunk");
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

let lex = (acc: LexList, state: ELexState, buffer: string, code: string) => {
  if (isEmpty(code)) {
    switch (state) {
      case ELexState.space:
        return acc;
      case ELexState.token:
        return conj(acc, buffer);
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
    let c = code[0];
    let body = code.slice(1);
    switch (state) {
      case ELexState.space:
        switch (c) {
          case " ":
            return lex(acc, ELexState.space, "", body);
          case "\n":
            return lex(acc, ELexState.indent, "", body);
          case "(":
            return lex(conj(acc, ELexControl.open), ELexState.space, "", body);
          case ")":
            return lex(conj(acc, ELexControl.close), ELexState.space, "", body);
          case '"':
            return lex(acc, ELexState.string, "", body);
          default:
            return lex(acc, ELexState.token, c, body);
        }
      case ELexState.token:
        switch (c) {
          case " ":
            return lex(conj(acc, buffer), ELexState.space, "", body);
          case '"':
            return lex(conj(acc, buffer), ELexState.string, "", body);
          case "\n":
            return lex(conj(acc, buffer), ELexState.indent, "", body);
          case "(":
            return lex(conj(acc, buffer, ELexControl.open), ELexState.space, "", body);
          case ")":
            return lex(conj(acc, buffer, ELexControl.close), ELexState.space, "", body);
          default:
            return lex(acc, ELexState.token, `${buffer}${c}`, body);
        }
      case ELexState.string:
        switch (c) {
          case '"':
            return lex(conj(acc, buffer), ELexState.space, "", body);
          case "\\":
            return lex(acc, ELexState.escape, buffer, body);
          case "\n":
            throw new Error("Expected newline in string");
          default:
            return lex(acc, ELexState.string, `${buffer}${c}`, body);
        }
      case ELexState.escape:
        switch (c) {
          case '"':
            return lex(acc, ELexState.string, `${buffer}"`, body);
          case "t":
            return lex(acc, ELexState.string, `${buffer}\t`, body);
          case "n":
            return lex(acc, ELexState.string, `${buffer}\n`, body);
          case "\\":
            return lex(acc, ELexState.string, `${buffer}\\`, body);
          default:
            throw new Error(`Unknown ${c} in escape`);
        }
      case ELexState.indent:
        switch (c) {
          case " ":
            return lex(acc, ELexState.indent, `${buffer}${c}`, body);
          case "\n":
            return lex(acc, ELexState.indent, "", body);
          case '"':
            return lex(conj(acc, parseIndentation(buffer)), ELexState.string, "", body);
          case "(":
            return lex(conj(acc, parseIndentation(buffer), ELexControl.open), ELexState.space, "", body);
          default:
            return lex(conj(acc, parseIndentation(buffer)), ELexState.token, c, body);
        }
      default:
        console.log("Unknown", c);
        return acc;
    }
  }
};

let repeat = <T>(times: number, x: T) => {
  let xs: T[] = [];
  for (let i = 1; i <= times; i++) {
    xs.push(x);
  }
  return xs;
};

let resolveIndentations = (acc: LexList, level: number, tokens: string[]) => {
  if (isEmpty(tokens)) {
    if (isEmpty(acc)) {
      return [];
    } else {
      return addToList([ELexControl.open] as LexList, acc, repeat(level, ELexControl.close), [ELexControl.close]);
    }
  } else {
    let cursor = tokens[0];
    if (typeof cursor === "string") {
      return resolveIndentations(conj(acc, cursor), level, tokens.slice(1));
    } else if (cursor === ELexControl.open || cursor === ELexControl.close) {
      return resolveIndentations(conj(acc, cursor), level, tokens.slice(1));
    } else if (typeof cursor === "number") {
      if (cursor > level) {
        let delta = cursor - level;
        return resolveIndentations(addToList(acc, repeat(delta, ELexControl.open)), cursor, tokens.slice(1));
      } else if (cursor < level) {
        let delta = level - cursor;
        return resolveIndentations(addToList(acc, repeat(delta, ELexControl.close), [ELexControl.close, ELexControl.open]), cursor, tokens.slice(1));
      } else {
        return resolveIndentations(isEmpty(acc) ? [] : conj(acc, ELexControl.close, ELexControl.open), level, tokens.slice(1));
      }
    } else {
      console.log(cursor);
      throw new Error("Unknown token");
    }
  }
};

export let parse = (code: string) => {
  let tokens = resolveIndentations([], 0, lex([], ELexState.indent, "", code));
  let refTokens = tokens.slice();
  let pullToken = () => {
    if (isEmpty(refTokens)) {
      return null;
    } else {
      let result = refTokens[0];
      refTokens.shift();
      return result;
    }
  };
  return resolveComma(resolveDollar(buildExprs(pullToken)));
};
