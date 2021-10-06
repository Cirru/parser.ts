import { ICirruNode, ELexState, ELexControl, LexList, LexListItem } from "./types";
import { pushToList, resolveComma, resolveDollar, isEmpty, isString, isNumber, isOdd, isArray } from "./tree";

export { ICirruNode } from "./types";

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
  // let count = 0;

  let pointer = 0;

  while (true) {
    // count += 1;
    // if (count > 1000) {
    //   break;
    // }
    if (pointer >= code.length) {
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
      let c = code[pointer];
      pointer += 1;
      switch (state) {
        case ELexState.space:
          switch (c) {
            case " ":
              [acc, state, buffer] = [acc, ELexState.space, ""];
              break;
            case "\n":
              [acc, state, buffer] = [acc, ELexState.indent, ""];
              break;
            case "(":
              acc.push(ELexControl.open);
              [state, buffer] = [ELexState.space, ""];
              break;
            case ")":
              acc.push(ELexControl.close);
              [state, buffer] = [ELexState.space, ""];
              break;
            case '"':
              [acc, state, buffer] = [acc, ELexState.string, ""];
              break;
            default:
              [acc, state, buffer] = [acc, ELexState.token, c];
              break;
          }
          break;
        case ELexState.token:
          switch (c) {
            case " ":
              acc.push(buffer);
              [state, buffer] = [ELexState.space, ""];
              break;
            case '"':
              acc.push(buffer);
              [state, buffer] = [ELexState.string, ""];
              break;
            case "\n":
              acc.push(buffer);
              [state, buffer] = [ELexState.indent, ""];
              break;
            case "(":
              acc.push(buffer, ELexControl.open);
              [state, buffer] = [ELexState.space, ""];
              break;
            case ")":
              acc.push(buffer, ELexControl.close);
              [state, buffer] = [ELexState.space, ""];
              break;
            default:
              [acc, state, buffer] = [acc, ELexState.token, `${buffer}${c}`];
              break;
          }
          break;
        case ELexState.string:
          switch (c) {
            case '"':
              acc.push(buffer);
              [state, buffer] = [ELexState.space, ""];
              break;
            case "\\":
              [acc, state, buffer] = [acc, ELexState.escape, buffer];
              break;
            case "\n":
              throw new Error("Expected newline in string");
            default:
              [acc, state, buffer] = [acc, ELexState.string, `${buffer}${c}`];
              break;
          }
          break;
        case ELexState.escape:
          switch (c) {
            case '"':
              [acc, state, buffer] = [acc, ELexState.string, `${buffer}"`];
              break;
            case "'":
              [acc, state, buffer] = [acc, ELexState.string, `${buffer}'`];
              break;
            case "t":
              [acc, state, buffer] = [acc, ELexState.string, `${buffer}\t`];
              break;
            case "n":
              [acc, state, buffer] = [acc, ELexState.string, `${buffer}\n`];
              break;
            case "\\":
              [acc, state, buffer] = [acc, ELexState.string, `${buffer}\\`];
              break;
            default:
              throw new Error(`Unknown ${c} in escape`);
          }
          break;
        case ELexState.indent:
          switch (c) {
            case " ":
              [acc, state, buffer] = [acc, ELexState.indent, `${buffer}${c}`];
              break;
            case "\n":
              [acc, state, buffer] = [acc, ELexState.indent, ""];
              break;
            case '"':
              acc.push(parseIndentation(buffer));
              [state, buffer] = [ELexState.string, ""];
              break;
            case "(":
              acc.push(parseIndentation(buffer), ELexControl.open);
              [state, buffer] = [ELexState.space, ""];
              break;
            default:
              acc.push(parseIndentation(buffer));
              [state, buffer] = [ELexState.token, c];
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
  let pointer = 0;
  let pullToken = () => {
    let c = tokens[pointer];
    pointer += 1;
    return c;
  };
  return resolveComma(resolveDollar(buildExprs(pullToken)));
};
