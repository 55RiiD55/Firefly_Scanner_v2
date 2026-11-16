"use client";

import { useEffect, useState } from "react";

export interface LiveWeather {
  location: string;
  temperature: number;
  pressure: number;
  humidity: number;
  windSpeed: number;
  source: string;
  observedAt: string;
  timezone: string;
}

export function useLiveWeather(enabled = true) {
  const [weather, setWeather] = useState<LiveWeather | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let activeController: AbortController | null = null;

    async function refreshWeather() {
      // Cancel any previous weather request.
      activeController?.abort();

      const controller = new AbortController();
      activeController = controller;

      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/weather/current", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const contentType = response.headers.get("content-type") ?? "";

        if (!contentType.includes("application/json")) {
          throw new Error(
            `Weather endpoint returned non-JSON response (${response.status}). Check /api/weather/current.`,
          );
        }

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload.message ?? `Weather request failed (${response.status})`,
          );
        }

        const data = payload.data ?? payload;

        if (
          typeof data.temperature !== "number" ||
          typeof data.pressure !== "number" ||
          typeof data.humidity !== "number" ||
          typeof data.windSpeed !== "number"
        ) {
          throw new Error("Invalid weather API response");
        }

        if (cancelled || controller.signal.aborted) return;

        setWeather({
          location:
            data.resolvedLocation ?? data.location ?? "Configured location",
          temperature: data.temperature,
          pressure: data.pressure,
          humidity: data.humidity,
          windSpeed: data.windSpeed,
          source: data.source ?? "Open-Meteo",
          observedAt: data.observedAt ?? "",
          timezone: data.timezone ?? "",
        });

        setError("");
      } catch (cause) {
        if (cancelled || controller.signal.aborted) return;

        // Keep the previous successful weather data if a refresh fails.
        setError(
          cause instanceof Error ? cause.message : "Unable to retrieve weather",
        );
      } finally {
        if (!cancelled && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    // Fetch immediately.
    void refreshWeather();

    // Refresh every five minutes.
    const interval = window.setInterval(
      () => {
        void refreshWeather();
      },
      5 * 60 * 1000,
    );

    return () => {
      cancelled = true;
      activeController?.abort();
      window.clearInterval(interval);
    };
  }, [enabled]);

  return { weather, loading, error };
}
