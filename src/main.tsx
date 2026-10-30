import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { usesHashRouting } from "./utils/invitations";
import "@fontsource/cinzel/500.css";
import "@fontsource/cinzel/600.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./styles.css";
import "./styles-game.css";
import "./styles-quests.css";
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
const Router = usesHashRouting() ? HashRouter : BrowserRouter;
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router basename={usesHashRouting() ? undefined : import.meta.env.BASE_URL}>
      <App />
    </Router>
  </React.StrictMode>,
);
