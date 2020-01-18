export type ICirruNode = string | ICirruNode[];

export enum ELexState {
  space,
  token,
  escape,
  indent,
  string,
}

export enum ELexControl {
  open = -1000,
  close = -2000,
}

export type LexList = (string | ELexControl | number)[];
export type LexListItem = string | ELexControl | number;
