import { useCallback, useEffect, useRef, useState } from "react";
import { identity, subscribeRoom } from "../services/rooms";
import {
  gameAction,
  getGame,
  type GameSnapshot,
  type GameAction,
} from "../services/game";
import { message } from "../utils/errors";
export function useGame(code: string) {
  const [game, setGame] = useState<GameSnapshot | null>(null),
    [user, setUser] = useState(""),
    [fetchError, setFetchError] = useState(""),
    [actionError, setActionError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("Connecting");
  const alive = useRef(false),
    request = useRef(0),
    acting = useRef(false);
  const refresh = useCallback(async () => {
    const seq = ++request.current;
    try {
      const data = await getGame(code);
      if (alive.current && seq === request.current) {
        setGame((old) =>
          old?.id === data?.id && old && data && old.version > data.version
            ? old
            : data,
        );
        setLoading(false);
        setFetchError("");
      }
    } catch (e) {
      if (alive.current && seq === request.current) {
        setFetchError(message(e));
        setLoading(false);
      }
    }
  }, [code]);
  useEffect(() => {
    alive.current = true;
    void identity()
      .then((id) => {
        if (alive.current) setUser(id);
      })
      .catch((e) => {
        if (alive.current) setFetchError(message(e));
      });
    void refresh();
    const unsubscribe = subscribeRoom(
      code,
      () => void refresh(),
      (s) => {
        if (alive.current) setStatus(s);
      },
    );
    const timer = setInterval(() => void refresh(), 10000);
    const wake = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", wake);
    return () => {
      alive.current = false;
      request.current++;
      unsubscribe();
      clearInterval(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [code, refresh]);
  async function act(action: GameAction, payload: unknown = {}) {
    if (!game || acting.current) return false;
    acting.current = true;
    setBusy(true);
    setActionError("");
    let ok = false;
    try {
      await gameAction(game, action, payload);
      ok = true;
    } catch (e) {
      if (alive.current) setActionError(message(e));
    } finally {
      await refresh();
      acting.current = false;
      if (alive.current) setBusy(false);
    }
    return ok;
  }
  return {
    game,
    user,
    error: fetchError || actionError,
    fetchError,
    loading,
    busy,
    status,
    act,
    refresh,
  };
}
