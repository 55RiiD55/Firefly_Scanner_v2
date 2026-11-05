"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import ParticleImpactAnimation from "@/components/animations/ParticleImpactAnimation";
import RadiationAlert from "@/components/scan/RadiationAlert";

type ScenarioType = "positive" | "negative";
type ScanPhase = "animation" | "alert" | "verifying";

interface ScanConfig {
  scanId: string;
  scenarioType: ScenarioType;
  videoEnabled: boolean;
}

const PARTICLE_DURATION = {
  positive: 50,
  negative: 300,
} as const;

// Time the radiation alert remains visible AFTER animation.
const ALERT_DURATION = 20;

export default function ParticleImpactPage() {
  const router = useRouter();

  const [config, setConfig] = useState<ScanConfig | null>(null);

  const [error, setError] = useState("");
  const [phase, setPhase] = useState<ScanPhase>("animation");
  const [remaining, setRemaining] = useState(ALERT_DURATION);

  // Prevent repeated animation completion callbacks.
  const completionStarted = useRef(false);

  // 1. Load active simulation configuration.
  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const response = await fetch("/api/simulations/active", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load active simulation");
        }

        const data = await response.json();

        if (cancelled) return;

        const scenarioType = data.scenarioType;

        if (scenarioType !== "positive" && scenarioType !== "negative") {
          throw new Error("Invalid scenario configuration");
        }

        if (!data.id) {
          throw new Error("Missing active scan ID");
        }

        setConfig({
          scanId: data.id,
          scenarioType,
          videoEnabled: Boolean(data.videoEnabled),
        });
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error ? err.message : "Failed to initialize animation",
        );
      }
    }

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const duration = config ? PARTICLE_DURATION[config.scenarioType] : 0;

  // 2. Called ONLY when the animation finishes.
  const handleAnimationComplete = useCallback(() => {
    if (completionStarted.current) return;

    completionStarted.current = true;

    // Start the alert phase instead of navigating.
    setRemaining(ALERT_DURATION);
    setPhase("alert");
  }, []);

  // 3. Display alert and count down its own duration.
  useEffect(() => {
    if (phase !== "alert") return;

    const startedAt = Date.now();

    const interval = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;

      const secondsLeft = Math.max(0, Math.ceil(ALERT_DURATION - elapsed));

      setRemaining(secondsLeft);
    }, 250);

    const timeout = window.setTimeout(() => {
      setRemaining(0);
      setPhase("verifying");
    }, ALERT_DURATION * 1000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [phase]);

  // 4. Verify simulation and determine next route.
  useEffect(() => {
    if (phase !== "verifying" || !config) return;

    let cancelled = false;

    async function verifyAndNavigate() {
      try {
        const response = await fetch("/api/simulations/active", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to verify scan");
        }

        const data = await response.json();

        if (cancelled) return;

        if (data.id !== config!.scanId) {
          throw new Error("Active scan has changed");
        }

        // Validate the scenario is still the same.
        if (data.scenarioType !== config!.scenarioType) {
          throw new Error("Scan scenario has changed");
        }

        const nextRoute =
          config!.scenarioType === "positive" && config!.videoEnabled
            ? "/scan/uplinkv2"
            : "/scan/live";

        router.replace(nextRoute);
      } catch (err) {
        if (cancelled) return;

        setError(
          err instanceof Error ? err.message : "Unable to complete scan",
        );
      }
    }

    void verifyAndNavigate();

    return () => {
      cancelled = true;
    };
  }, [phase, config, router]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-red-400">
        {error}
      </main>
    );
  }

  if (!config) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        Initializing Scanner...
      </main>
    );
  }

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#030107]">
      {/* Phase 1: Particle animation */}
      {phase === "animation" && (
        <ParticleImpactAnimation
          key={config.scanId}
          variant={config.scenarioType}
          duration={duration}
          loop={false}
          particleCount={config.scenarioType === "positive" ? 8500 : 5000}
          ringCount={config.scenarioType === "positive" ? 12 : 0}
          className="absolute inset-0"
          onComplete={handleAnimationComplete}
        />
      )}

      {/* Phase 2: Radiation alert after animation */}
      {phase === "alert" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <RadiationAlert
            scenario={config.scenarioType}
            remainingSeconds={remaining}
          />
        </div>
      )}

      {/* Phase 3: Verifying and redirecting */}
      {phase === "verifying" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="animate-pulse text-sm tracking-widest text-slate-400">
            VERIFYING SCAN RESULTS...
          </p>
        </div>
      )}
    </main>
  );
}
