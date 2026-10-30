import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/cinzel/500.css";
import "@fontsource/cinzel/600.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./styles.css";
import "./styles-game.css";
import App from "./App";
try {
  const preferences = JSON.parse(
    localStorage.getItem("crownfall-preferences") || "{}",
  );
  document.documentElement.dataset.reducedMotion = String(
    preferences.motion === true,
  );
} catch {
  /* Invalid stored preferences use browser defaults. */
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
