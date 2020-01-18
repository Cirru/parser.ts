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
  if (isEmpty(xs)) {
    return [];
  } else {
    return commaHelper(xs);
  }
};

let commaHelper = (intialAfter: ICirruNode[]) => {
  let before: ICirruNode[] = [];
  let after: ICirruNode[] = intialAfter.slice();

  while (true) {
    if (isEmpty(after)) {
      return before;
    }
    let cursor = after[0];
    let afterRest = after.slice(1);
    if (isArray(cursor) && notEmpty(cursor)) {
      let head = cursor[0];
      if (isArray(head)) {
        before.push(resolveComma(cursor));
        after = afterRest;
      } else if (head === ",") {
        pushToList(before, resolveComma(cursor.slice(1)));
        after = afterRest;
      } else {
        before.push(resolveComma(cursor));
        after = afterRest;
      }
    } else {
      before.push(cursor);
      after = afterRest;
    }
  }
};

export let resolveDollar = (xs: ICirruNode[]) => {
  if (isEmpty(xs)) {
    return [];
  } else {
    return dollarHelper(xs);
  }
};

let dollarHelper = (initialAfter: ICirruNode[]) => {
  let before: ICirruNode[] = [];
  let after: ICirruNode[] = initialAfter;
  while (true) {
    if (isEmpty(after)) {
      return before;
    } else {
      let cursor = after[0];
      let afterRest = after.slice(1);
      if (isArray(cursor)) {
        before.push(resolveDollar(cursor));
        after = afterRest;
      } else if (cursor === "$") {
        before.push(resolveDollar(afterRest));
        after = [];
      } else {
        before.push(cursor);
        after = afterRest;
      }
    }
  }
};
