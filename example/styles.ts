import { css, cx } from "@emotion/css";

export const fullscreen = css`
  position: absolute;
  background-color: white;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
`;

export const row = css`
  display: flex;
  flex-direction: row;
  align-items: stretch;
`;

export const inlineRow = css`
  display: inline-flex;
  flex-direction: row;
  align-items: stretch;
  margin-right: 15px;

  &:last-child {
    margin-right: 0;
  }
`;

export const column = css`
  display: flex;
  flex-direction: column;
  align-items: stretch;
`;

export const rowCenter = css`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: row;
`;

export const center = css`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

// 用于 toolbar, 两个子元素分别位于两端, 或者借助空节点进行右对齐
export const rowParted = css`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

export const columnParted = css`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: stretch;
`;

export const expand = css`
  flex: 1;
  overflow: auto;
`;

export const displayFlex = css`
  display: flex;
`;

export const flexWrap = css`
  flex-wrap: wrap;
`;

export const alignItemCenter = css`
  align-items: center;
`;

export const alignItemBottom = css`
  align-items: flex-end;
`;

export const noShrink = css`
  flex-shrink: 0;
`;

export const inlineBlock = css`
  display: inline-block;
`;

export const verticalAlignBottom = css`
  vertical-align: bottom;
`;

export const relative = css`
  position: relative;
`;

export const absCenter = css`
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
`;

export const absLeftCenter = css`
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
`;

export const absRightCenter = css`
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
`;

export const absRightTop = css`
  position: absolute;
  right: 0;
  top: 0;
`;

export const xHiddenYAuto = css`
  overflow-x: hidden;
  overflow-y: auto;
`;

export const maxHeight80vh = css`
  max-height: 80vh;
`;

export const rowMiddle = css`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-direction: row;
`;

export const middleSection = css`
  width: 45%;
  border-right: 1px solid #e8e8e8;
`;

export const minHeight = css`
  min-height: 100%;
`;

export const inlineRowMiddle = css`
  display: inline-flex;
  flex-direction: row;
  align-items: center;
`;

export const fullHeight = css`
  height: 100%;
`;
