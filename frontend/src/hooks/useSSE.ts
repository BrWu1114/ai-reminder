import { useEffect, useRef, useCallback } from "react";

export type SSEHandler = (data: unknown) => void;

export function useSSE(handlers: Record<string, SSEHandler>) {
  const esRef = useRef<EventSource | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close();

    const es = new EventSource("/api/notifications/stream");
    esRef.current = es;

    es.addEventListener("connected", () => {
      console.log("[sse] Connected to reminder stream");
    });

    // Bind all custom event handlers
    for (const event of Object.keys(handlersRef.current)) {
      es.addEventListener(event, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handlersRef.current[event]?.(data);
        } catch {}
      });
    }

    es.onerror = () => {
      console.warn("[sse] Connection lost — reconnecting in 5s…");
      es.close();
      setTimeout(connect, 5_000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => esRef.current?.close();
  }, [connect]);
}
