"use client";

import { useEffect, useRef } from "react";

/**
 * Polls a callback at a given interval (ms).
 * Stops when shouldPoll returns false.
 */
export function usePolling(
  callback: () => void | Promise<void>,
  intervalMs: number,
  shouldPoll: boolean
) {
  const savedCallback = useRef(callback);
  savedCallback.current = callback;

  useEffect(() => {
    if (!shouldPoll) return;

    const tick = () => savedCallback.current();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, shouldPoll]);
}
