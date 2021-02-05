import ReactDOM from "react-dom";
import React from "react";

import "main.css";

import Container from "./pages/container";

const renderApp = () => {
  ReactDOM.render(<Container router={{}} />, document.querySelector(".app"));
};

window.onload = renderApp;

window.addEventListener("hashchange", () => {
  renderApp();
});

declare var module: any;

if (module.hot) {
  module.hot.accept(["./pages/container"], () => {
    renderApp();
  });
}
