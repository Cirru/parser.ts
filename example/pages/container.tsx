import React, { FC, useState } from "react";
import { css, cx } from "@emotion/css";
import { fullscreen, row, expand, column, rowParted } from "../styles";

import { parse } from "../../src/index";

let Container: FC<{ router: any }> = React.memo((props) => {
  let [code, setCode] = useState("");
  let [result, setResult] = useState(null);

  /** Methods */
  /** Effects */
  /** Renderers */
  return (
    <div className={cx(fullscreen, column, styleContainer)}>
      <div className={cx(rowParted, styleHeader)}>
        <span>Cirru Parser in TypeScript</span>
        <button
          onClick={() => {
            console.log("parse");
          }}
        >
          Parse
        </button>
      </div>
      <div className={cx(expand, row)}>
        <textarea
          className={cx(expand, styleCode)}
          value={code}
          onChange={(event) => {
            let c = event.target.value;
            setCode(c);
            try {
              let started = Date.now();
              setResult(JSON.stringify(parse(c), null, 2));
              // let data = parse(c);
              console.warn("finished", Date.now() - started);
            } catch (error) {
              console.dir(error);
              setResult(error.stack);
            }
          }}
        />
        <textarea className={cx(expand, styleCode)} value={result} />
      </div>
    </div>
  );
});

export default Container;

const styleContainer = css``;

let styleHeader = css`
  padding: 8px;
`;

let styleCode = css`
  padding: 8px;
  font-family: Source Code Pro, Menlo, monospace;
  white-space: pre;
`;
