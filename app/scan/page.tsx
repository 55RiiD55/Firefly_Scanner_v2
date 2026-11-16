"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./ScanPage.module.css";

export default function ScanPage() {
  const router = useRouter();

  const [isStarting, setIsStarting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [startError, setStartError] = useState("");

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleStartScan = async () => {
    if (startingRef.current || isScanning) return;

    startingRef.current = true;
    setIsStarting(true);
    setStartError("");

    try {
      const response = await fetch("/api/simulations/start", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to start scanner");
      }

      setIsScanning(true);
      setIsStarting(false);

      // Collect and persist weather for the newly started simulation.
      // Weather failure should not prevent scanner initialization.
      void fetch("/api/weather/current", {
        method: "GET",
        cache: "no-store",
      })
        .then(async (weatherResponse) => {
          const weatherData = await weatherResponse.json();

          if (!weatherResponse.ok) {
            console.warn(
              "[Scanner] Weather collection failed:",
              weatherData.message,
            );
            return;
          }

          console.log("[Scanner] Environment snapshot collected:", weatherData);
        })
        .catch((error) => {
          console.error("[Scanner] Weather collection error:", error);
        });

      timeoutRef.current = setTimeout(() => {
        router.push("/scan/initialize");
      }, 3000);
    } catch (error) {
      setStartError(error instanceof Error ? error.message : "Scan failed");
      setIsStarting(false);
      startingRef.current = false;
    }
  };

  return (
    <main className={styles.viewport}>
      <div
        className={`${styles.loader} ${isScanning ? styles.active : ""}`}
        role="group"
        aria-label="Radioanalysis radar scanner"
      >
        <span className={styles.sweep} aria-hidden="true" />

        {!isScanning && (
          <button
            type="button"
            onClick={handleStartScan}
            disabled={isStarting}
            className={styles.startButton}
            aria-label="Start scanner"
          >
            {isStarting ? (
              <span className={styles.buttonText}>Starting...</span>
            ) : (
              <svg
                viewBox="0 0 24 24"
                width="36"
                height="36"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        )}
      </div>

      {startError && (
        <p role="alert" className={styles.error}>
          {startError}
        </p>
      )}

      {isScanning && (
        <p className={styles.status} role="status">
          Initializing scanner...
        </p>
      )}
    </main>
  );
}
