import { ICirruNode } from "./types";

export let pushToList = <T>(acc: T[], xs: T[], ys?: T[], zs?: T[]) => {
  let result = acc;
  xs.forEach((x) => {
    result.push(x);
  });
  if (ys != null) {
    ys.forEach((y) => {
      result.push(y);
    });
  }
  if (zs != null) {
    zs.forEach((y) => {
      result.push(y);
    });
  }
  return result;
};

export let isArray = Array.isArray;
export let isEmpty = (xs: any[] | string) => xs.length === 0;
export let notEmpty = (xs: any[]) => xs.length > 0;
export let isString = (x: any) => typeof x === "string";
export let isNumber = (x: any) => typeof x === "number";
export let isOdd = (x: number) => x % 2 === 1;

export let resolveComma = (xs: ICirruNode[]) => {
  if (xs.length === 0) {
    return [];
  } else {
    return commaHelper(xs, 0);
  }
};

let commaHelper = (after: ICirruNode[], start: number): ICirruNode[] => {
  let before: ICirruNode[] = [];
  let pointer = start;

  while (true) {
    if (pointer >= after.length) {
      return before;
    }
    let cursor = after[pointer];

    if (isArray(cursor) && cursor.length > 0) {
      let head = cursor[0];
      if (isArray(head)) {
        before.push(commaHelper(cursor, 0));
        pointer += 1;
      } else if (head === ",") {
        // spread comma-expanded tail into before without a slice allocation
        const expanded = commaHelper(cursor, 1);
        for (let i = 0; i < expanded.length; i++) before.push(expanded[i]);
        pointer += 1;
      } else {
        before.push(commaHelper(cursor, 0));
        pointer += 1;
      }
    } else {
      before.push(cursor);
      pointer += 1;
    }
  }
};

export let resolveDollar = (xs: ICirruNode[]) => {
  if (xs.length === 0) {
    return [];
  } else {
    return dollarHelper(xs, 0);
  }
};

// Pass `start` to avoid `after.slice(pointer + 1)` allocation on every `$` token.
let dollarHelper = (after: ICirruNode[], start: number): ICirruNode[] => {
  let before: ICirruNode[] = [];
  let pointer = start;

  while (true) {
    if (pointer >= after.length) {
      return before;
    }
    let cursor = after[pointer];

    if (isArray(cursor)) {
      before.push(dollarHelper(cursor, 0));
      pointer += 1;
    } else if (cursor === "$") {
      before.push(dollarHelper(after, pointer + 1)); // no slice needed — pass bounds
      break;
    } else {
      before.push(cursor);
      pointer += 1;
    }
  }
  return before;
};
