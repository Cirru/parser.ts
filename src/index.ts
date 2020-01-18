import { ICirruNode, ELexState, ELexControl, LexList, LexListItem } from "./types";
import { conj, pushToList, addToList, resolveComma, resolveDollar, isEmpty, isString, isNumber, isOdd, isArray } from "./tree";

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

let lex = (initialCode: string) => {
  let acc: LexList = [];
  let state = ELexState.indent as ELexState;
  let buffer = "";
  let code = initialCode;
  // let count = 0;
  while (true) {
    // count += 1;
    // if (count > 1000) {
    //   break;
    // }
    if (isEmpty(code)) {
      switch (state) {
        case ELexState.space:
          return acc;
        case ELexState.token:
          acc.push(buffer);
          return acc;
          break;
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
              [acc, state, buffer, code] = [acc, ELexState.space, "", body];
              break;
            case "\n":
              [acc, state, buffer, code] = [acc, ELexState.indent, "", body];
              break;
            case "(":
              acc.push(ELexControl.open);
              [state, buffer, code] = [ELexState.space, "", body];
              break;
            case ")":
              acc.push(ELexControl.close);
              [state, buffer, code] = [ELexState.space, "", body];
              break;
            case '"':
              [acc, state, buffer, code] = [acc, ELexState.string, "", body];
              break;
            default:
              [acc, state, buffer, code] = [acc, ELexState.token, c, body];
              break;
          }
          break;
        case ELexState.token:
          switch (c) {
            case " ":
              acc.push(buffer);
              [state, buffer, code] = [ELexState.space, "", body];
              break;
            case '"':
              acc.push(buffer);
              [state, buffer, code] = [ELexState.string, "", body];
              break;
            case "\n":
              acc.push(buffer);
              [state, buffer, code] = [ELexState.indent, "", body];
              break;
            case "(":
              acc.push(buffer, ELexControl.open);
              [state, buffer, code] = [ELexState.space, "", body];
              break;
            case ")":
              acc.push(buffer, ELexControl.close);
              [state, buffer, code] = [ELexState.space, "", body];
              break;
            default:
              [acc, state, buffer, code] = [acc, ELexState.token, `${buffer}${c}`, body];
              break;
          }
          break;
        case ELexState.string:
          switch (c) {
            case '"':
              acc.push(buffer);
              [state, buffer, code] = [ELexState.space, "", body];
              break;
            case "\\":
              [acc, state, buffer, code] = [acc, ELexState.escape, buffer, body];
              break;
            case "\n":
              throw new Error("Expected newline in string");
            default:
              [acc, state, buffer, code] = [acc, ELexState.string, `${buffer}${c}`, body];
              break;
          }
          break;
        case ELexState.escape:
          switch (c) {
            case '"':
              [acc, state, buffer, code] = [acc, ELexState.string, `${buffer}"`, body];
              break;
            case "t":
              [acc, state, buffer, code] = [acc, ELexState.string, `${buffer}\t`, body];
              break;
            case "n":
              [acc, state, buffer, code] = [acc, ELexState.string, `${buffer}\n`, body];
              break;
            case "\\":
              [acc, state, buffer, code] = [acc, ELexState.string, `${buffer}\\`, body];
              break;
            default:
              throw new Error(`Unknown ${c} in escape`);
          }
          break;
        case ELexState.indent:
          switch (c) {
            case " ":
              [acc, state, buffer, code] = [acc, ELexState.indent, `${buffer}${c}`, body];
              break;
            case "\n":
              [acc, state, buffer, code] = [acc, ELexState.indent, "", body];
              break;
            case '"':
              acc.push(parseIndentation(buffer));
              [state, buffer, code] = [ELexState.string, "", body];
              break;
            case "(":
              acc.push(parseIndentation(buffer), ELexControl.open);
              [state, buffer, code] = [ELexState.space, "", body];
              break;
            default:
              acc.push(parseIndentation(buffer));
              [state, buffer, code] = [ELexState.token, c, body];
              break;
          }
          break;
        default:
          console.log("Unknown", c);
          return acc;
      }
    }
  }
  return acc;
};

let repeat = <T>(times: number, x: T) => {
  let xs: T[] = [];
  for (let i = 1; i <= times; i++) {
    xs.push(x);
  }
  return xs;
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
        pushToList(acc, repeat(level, ELexControl.close), [ELexControl.close]);
        return acc;
      }
    } else {
      let cursor = tokens[pointer];
      if (typeof cursor === "string") {
        acc.push(cursor);
        pointer += 1;
        [level] = [level];
      } else if (cursor === ELexControl.open || cursor === ELexControl.close) {
        acc.push(cursor);
        pointer += 1;
        [level] = [level];
      } else if (typeof cursor === "number") {
        if (cursor > level) {
          let delta = cursor - level;
          pushToList(acc, repeat(delta, ELexControl.open));
          pointer += 1;
          [level] = [cursor];
        } else if (cursor < level) {
          let delta = level - cursor;
          pushToList(acc, repeat(delta, ELexControl.close), [ELexControl.close, ELexControl.open]);
          pointer += 1;
          [level] = [cursor];
        } else {
          if (isEmpty(acc)) {
            acc = [];
          } else {
            acc.push(ELexControl.close, ELexControl.open);
          }
          pointer += 1;
          [level] = [level];
        }
      } else {
        console.log(cursor);
        throw new Error("Unknown token");
      }
    }
  }
};

export let parse = (code: string) => {
  let tokens = resolveIndentations(lex(code));
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
