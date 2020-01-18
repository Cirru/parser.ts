import { ICirruNode } from "./types";

export let addToList = <T>(acc: T[], xs: T[], ys?: T[], zs?: T[]) => {
  let result = acc.slice();
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

export let conj = <T>(xs: T[], x: T, y?: T) => {
  let ys = xs.slice();
  ys.push(x);
  if (y != null) {
    ys.push(y);
  }
  return ys;
};

export let resolveComma = (xs: ICirruNode[]) => {
  if (isEmpty(xs)) {
    return [];
  } else {
    return commaHelper([], xs);
  }
};

let commaHelper = (before: ICirruNode[], after: ICirruNode[]) => {
  if (isEmpty(after)) {
    return before;
  }
  let cursor = after[0];
  let cursorRest = after.slice(1);
  if (isArray(cursor) && notEmpty(cursor)) {
    let head = cursor[0];
    if (isArray(head)) {
      return commaHelper(conj(before, resolveComma(cursor)), cursorRest);
    } else if (head === ",") {
      return commaHelper(addToList(before, resolveComma(cursor.slice(1))), cursorRest);
    } else {
      return commaHelper(conj(before, resolveComma(cursor)), cursorRest);
    }
  } else {
    return commaHelper(conj(before, cursor), cursorRest);
  }
};

export let resolveDollar = (xs: ICirruNode[]) => {
  if (isEmpty(xs)) {
    return [];
  } else {
    return dollarHelper([], xs);
  }
};

let dollarHelper = (before: ICirruNode[], after: ICirruNode[]) => {
  if (isEmpty(after)) {
    return before;
  } else {
    let cursor = after[0];
    let cursorRest = after.slice(1);
    if (isArray(cursor)) {
      return dollarHelper(conj(before, resolveDollar(cursor)), cursorRest);
    } else if (cursor === "$") {
      return conj(before, resolveDollar(cursorRest));
    } else {
      return dollarHelper(conj(before, cursor), cursorRest);
    }
  }
};
