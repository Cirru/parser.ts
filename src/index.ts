import { ICirruNode, ELexState, ELexControl } from "./types";

type FuncTokenGet = () => string | ELexControl;

let graspeExprs = (acc: ICirruNode[], pullToken: FuncTokenGet) => {
  let cursor = pullToken();
  switch (cursor) {
    case ELexControl.close:
      return acc;
    case ELexControl.open:
      let current = graspeExprs([], pullToken);
      return graspeExprs(acc.concat([current]), pullToken);
    default:
      console.log(cursor);
      throw new Error("Unknown cursor");
  }
};

let buildExprs = (pullToken: FuncTokenGet, peekToken: FuncTokenGet, putBack: (x: string) => void) => {
  let acc = [];
  while (true) {
    let chunk = pullToken();
    if (chunk === "open") {
      let expr = graspeExprs([], pullToken);
      acc.push(expr);
      continue;
    } else if (chunk == null) {
      return acc;
    } else {
      console.log(chunk);
      throw new Error("Unknown chunbk");
    }
  }
};

let parseIndentation = (buffer: string) => {
  let size = buffer.length;
  if (size % 2 === 1) {
    throw new Error(`Invalid indentation size ${size}`);
  }
  return size / 2;
};

let lex = (acc: (string | ELexControl)[], state: ELexState, buffer: string, code: string) => {
  if (code.length === 0) {
    switch (state) {
      case ELexState.space:
        return acc;
      case ELexState.token:
        return acc.concat(buffer);
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
    let body = c.slice(1);
    switch (state) {
      case ELexState.space:
        switch (c) {
          case " ":
            return lex(acc, ELexState.space, "", body);
          case "\n":
            return lex(acc, ELexState.indent, "", body);
          case "(":
            return lex(acc.concat("open"), ELexState.space, "", body);
          case ")":
            return lex(acc.concat("close"), ELexState.space, "", body);
          case '"':
            return lex(acc, ELexState.string, "", body);
          default:
            return lex(acc, ELexState.token, "", body);
        }
      case ELexState.token:
        switch (c) {
          case " ":
            return lex(acc.concat(buffer), ELexState.space, "", body);
          case '"':
            return lex(acc.concat(buffer), ELexState.string, "", body);
          case "\n":
            return lex(acc.concat(buffer), ELexState.indent, "", body);
          case "(":
            return lex(acc.concat(ELexControl.open), ELexState.space, "", body);
          case ")":
            return lex(acc.concat(ELexControl.close), ELexState.space, "", body);
          default:
            return lex(acc, ELexState.token, `${buffer}${c}`, body);
        }
      case ELexState.string:
        switch (c) {
          case '"':
            return lex(acc.concat(buffer), ELexState.space, "", body);
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
            return lex(acc.concat(parseIndentation(buffer)), ELexState.string, "", body);
          case "(":
            return lex(acc.concat(parseIndentation(buffer)), ELexState.token, "", body);
          default:
            return lex(acc.concat(parseIndentation(buffer)), ELexState.token, c, body);
        }
      default:
        console.log("Unknown", c);
        return acc;
    }
  }
};

let resolveIndentations = (acc: ICirruNode[], level: number, tokens: string[]) => {};

export let parse = (code: string) => {
  // TODO
};
