import React, { FC, useState } from "react";
import { css, cx } from "emotion";
import { fullscreen, row, expand, column, rowParted } from "@jimengio/flex-styles";

import { genRouter, GenRouterTypeMain } from "controller/generated-router";
import { parse } from "../../src/index";

let Container: FC<{ router: GenRouterTypeMain }> = React.memo((props) => {
  let [code, setCode] = useState("");
  let [result, setResult] = useState(null);

  /** Methods */
  /** Effects */
  /** Renderers */
  return (
    <div className={cx(fullscreen, column, styleContainer)}>
      <div className={cx(rowParted, styleHeader)}>
        <span />
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
              setResult(JSON.stringify(parse(c), null, 2));
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
`;
