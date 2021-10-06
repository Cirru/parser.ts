import ReactDOM from "react-dom";
import React from "react";

import "./main.css";

import Container from "./pages/container";

const renderApp = (Container) => {
  ReactDOM.render(<Container router={{}} />, document.querySelector(".app"));
};

window.onload = (e) => renderApp(Container);

if (import.meta.hot) {
  import.meta.hot.accept("./pages/container", (m) => {
    renderApp(m.default);
  });
}
