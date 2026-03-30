import { useState, useEffect, useRef, useCallback } from "react";
import { setLocation } from "../api";

const SIGNIFICANT_MOVE_M = 150; // metres before we report a new position
const POLL_INTERVAL_MS = 30_000; // fallback poll every 30s if watchPosition unavailable

export interface GeoState {
  tracking: boolean;
  coords: { lat: number; lng: number } | null;
  lastSent: Date | null;
  error: string | null;
}

function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aVal =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    tracking: false,
    coords: null,
    lastSent: null,
    error: null,
  });

  const lastSentCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendPosition = useCallback(
    async (lat: number, lng: number) => {
      const prev = lastSentCoordsRef.current;
      if (prev) {
        const dist = haversineM(prev, { lat, lng });
        if (dist < SIGNIFICANT_MOVE_M) return; // Not moved enough
      }

      lastSentCoordsRef.current = { lat, lng };
      const label = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      try {
        await setLocation(label, lat, lng);
        setState((s) => ({ ...s, coords: { lat, lng }, lastSent: new Date(), error: null }));
      } catch (err: any) {
        setState((s) => ({ ...s, error: err.message }));
      }
    },
    []
  );

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: "Geolocation not supported" }));
      return;
    }

    setState((s) => ({ ...s, tracking: true, error: null }));

    const onSuccess = (pos: GeolocationPosition) => {
      sendPosition(pos.coords.latitude, pos.coords.longitude);
    };
    const onError = (err: GeolocationPositionError) => {
      setState((s) => ({ ...s, error: err.message }));
    };
    const opts: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 15_000,
      timeout: 10_000,
    };

    if ("watchPosition" in navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        onSuccess,
        onError,
        opts
      );
    } else {
      // Fallback: poll
      const poll = () =>
        navigator.geolocation.getCurrentPosition(onSuccess, onError, opts);
      poll();
      pollTimerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    }
  }, [sendPosition]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (pollTimerRef.current != null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setState((s) => ({ ...s, tracking: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopTracking(), [stopTracking]);

  return { state, startTracking, stopTracking };
}
