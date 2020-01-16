export type ICirruNode = string | ICirruNode[];

export enum ELexState {
  space,
  token,
  escape,
  indent,
  string,
}
