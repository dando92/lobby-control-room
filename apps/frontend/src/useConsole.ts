import { useCallback, useEffect, useRef, useState } from "react";
import { UnauthorizedError, controlRoom, eventsUrl, type ConsoleState } from "./api";

const RECONNECT_MS = 2000;

export function useConsole() {
  const [state, setState] = useState<ConsoleState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [live, setLive] = useState(false);
  const socket = useRef<WebSocket | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopped = useRef(false);

  const readOnce = useCallback(async () => {
    try {
      setState(await controlRoom.state());
      setLocked(false);
    } catch (cause) {
      if (cause instanceof UnauthorizedError) {
        setLocked(true);
      } else {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    }
  }, []);

  useEffect(() => {
    stopped.current = false;

    const open = () => {
      if (stopped.current) {
        return;
      }
      const client = new WebSocket(eventsUrl());
      socket.current = client;

      client.onopen = () => setLive(true);
      client.onmessage = (frame) => {
        setState(JSON.parse(frame.data as string) as ConsoleState);
        setLocked(false);
      };
      client.onclose = () => {
        setLive(false);
        socket.current = null;
        void readOnce();
        if (!stopped.current) {
          retry.current = setTimeout(open, RECONNECT_MS);
        }
      };
      client.onerror = () => client.close();
    };

    open();

    return () => {
      stopped.current = true;
      if (retry.current) {
        clearTimeout(retry.current);
      }
      socket.current?.close();
    };
  }, [readOnce]);

  const act = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action();
        setError(null);
      } catch (cause) {
        if (cause instanceof UnauthorizedError) {
          setLocked(true);
        } else {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      }
      if (!socket.current) {
        await readOnce();
      }
    },
    [readOnce],
  );

  return { state, error, locked, live, act, dismissError: () => setError(null) };
}
