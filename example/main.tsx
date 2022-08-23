import { createRoot } from "react-dom/client";
import React from "react";

import "./main.css";

import Container from "./pages/container";

const renderApp = (Container) => {
  let root = createRoot(document.querySelector(".app"));
  root.render(<Container router={{}} />);
};

window.onload = (e) => renderApp(Container);

if (import.meta.hot) {
  import.meta.hot.accept("./pages/container", (m) => {
    renderApp(m.default);
  });
}
