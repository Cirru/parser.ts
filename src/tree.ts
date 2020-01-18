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
  let after: ICirruNode[] = intialAfter;

  let pointer = 0;

  while (true) {
    if (pointer >= after.length) {
      return before;
    }
    let cursor = after[pointer];

    if (isArray(cursor) && notEmpty(cursor)) {
      let head = cursor[0];
      if (isArray(head)) {
        before.push(resolveComma(cursor));
        pointer += 1;
      } else if (head === ",") {
        pushToList(before, resolveComma(cursor.slice(1)));
        pointer += 1;
      } else {
        before.push(resolveComma(cursor));
        pointer += 1;
      }
    } else {
      before.push(cursor);
      pointer += 1;
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

  let pointer = 0;

  while (true) {
    if (pointer >= after.length) {
      return before;
    } else {
      let cursor = after[pointer];

      if (isArray(cursor)) {
        before.push(resolveDollar(cursor));
        pointer += 1;
      } else if (cursor === "$") {
        before.push(resolveDollar(after.slice(pointer + 1))); // pick items after pointer for $
        pointer = after.length; // trying to exit
      } else {
        before.push(cursor);
        pointer += 1;
      }
    }
  }
};
