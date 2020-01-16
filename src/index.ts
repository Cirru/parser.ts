import { ICirruNode, ELexState } from "./types";

let graspeExprs = (acc, pullToken) => {};

let buildExprs = (pullToken, peekToken, putBack) => {
  // TODO
};

let parseIndentation = (buffer: string) => {
  // TODO
};

let lex = (acc: string[], state: ELexState, buffer: string, code: string) => {};

let resolveIndentations = (acc: ICirruNode[], level: number, tokens: string[]) => {};

export let parse = (code: string) => {
  // TODO
};
