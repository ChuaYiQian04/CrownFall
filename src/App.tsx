import { lazy, Suspense, useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { Crown, BookOpen, Settings2 } from "lucide-react";
import Home from "./pages/Home";
import Entry from "./pages/Entry";
import Lobby from "./pages/Lobby";
import Tutorial from "./pages/Tutorial";
import Settings from "./components/Settings";
const Game = lazy(() => import("./pages/Game"));
import { identity, isDemo } from "./services/rooms";
import { message } from "./utils/errors";
function App() {
  const [settings, setSettings] = useState(false);
  const [sessionError, setSessionError] = useState("");
  useEffect(() => {
    if (isDemo) return;
    let active = true;
    const restore = () => {
      void identity()
        .then(() => {
          if (active) setSessionError("");
        })
        .catch((error) => {
          if (active) setSessionError(message(error));
        });
    };
    restore();
    window.addEventListener("online", restore);
    return () => {
      active = false;
      window.removeEventListener("online", restore);
    };
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      <header className="site-header">
        <Link to="/" className="wordmark">
          <Crown size={25} />
          <span>CROWNFALL</span>
        </Link>
        <nav>
          <Link className="guide-link" to="/how-to-play">
            <BookOpen size={16} /> How to play
          </Link>
          <span className="nav-divider" />
          <button
            className="icon-button"
            aria-label="Settings"
            onClick={() => setSettings(true)}
          >
            <Settings2 size={20} />
          </button>
        </nav>
      </header>
      {sessionError && (
        <div className="session-error error" role="alert">
          {sessionError}
        </div>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<Entry host />} />
        <Route path="/join/:code?" element={<Entry />} />
        <Route path="/room/:code" element={<Lobby />} />
        <Route
          path="/game/:code"
          element={
            <Suspense
              fallback={
                <main className="page narrow">
                  <p role="status">Opening the council…</p>
                </main>
              }
            >
              <Game />
            </Suspense>
          }
        />
        <Route path="/how-to-play" element={<Tutorial />} />
        <Route
          path="*"
          element={
            <main className="page narrow">
              <h1>Lost in the realm?</h1>
              <Link to="/">Return home</Link>
            </main>
          }
        />
      </Routes>
      <footer>
        <span>
          <Crown size={14} /> A game of trust. A tale of betrayal.
        </span>
        <span>Gather together. Play anywhere.</span>
      </footer>
      <AnimatePresence>
        {settings && <Settings close={() => setSettings(false)} />}
      </AnimatePresence>
    </MotionConfig>
  );
}

export default App;
