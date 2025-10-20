import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyTheme, getPreferredTheme } from "./lib/theme";

if (typeof window !== "undefined") {
  applyTheme(getPreferredTheme());
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
