"use client";

import { useEffect, useMemo, useState } from "react";
import type { DeviceConfig, SimulationConfig } from "@/types/radioanalysis";
import type {
  ResultCardData,
  CombinedChartPoint,
  LineChartPoint,
} from "@/types/dashboard";

type Metrics = {
  cps: number;
  doseRate: number;
  battery: number;
  temperature: number;
  pressure: number;
};

export type DashboardIsotope = {
  id: string;
  name: string;
  symbol: string;
  status: "stable" | "unstable";
  energy: string;
  description: string;
};

export type EnvironmentSnapshot = {
  temperature: number;
  pressure: number;
  humidity: number;
  windSpeed: number;
  source: string;
  location: string;
  observedAt: string;
  timezone: string;
};

type ImpressionApiItem = {
  title: string;
  description: string;
};

type DashboardResponse = {
  simulationId: string;
  scenarioType: string;
  scenarioName: string;
  results: Metrics;
  units: Record<string, string>;
  isotopes: DashboardIsotope[];
  impression: ImpressionApiItem[];
  location: string;
  startedAt: string;
  environmentSnapshot?: EnvironmentSnapshot | null;
};

const EMPTY_METRICS: Metrics = {
  cps: 0,
  doseRate: 0,
  battery: 0,
  temperature: 0,
  pressure: 0,
};

export function useDashboardSimulation() {
  const [snapshot, setSnapshot] = useState<DashboardResponse | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const response = await fetch("/api/dashboard", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message ?? "Cannot load scan results");
        }

        if (!cancelled) {
          setSnapshot(data as DashboardResponse);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load scan results",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = snapshot?.results ?? EMPTY_METRICS;

  // These are recorded stable values, not generated time-series data.
  const resultCards: ResultCardData[] = [
    {
      id: "cps",
      title: "CPS",
      color: "#3b82c4",
      data: [{ value: metrics.cps }],
    },
    {
      id: "dose",
      title: "Dose Rate",
      color: "#e33131",
      data: [{ value: metrics.doseRate }],
    },
    {
      id: "battery",
      title: "Battery",
      color: "#16a02b",
      data: [{ value: metrics.battery }],
    },
  ];

  const device: DeviceConfig | null = snapshot
    ? {
        id: snapshot.simulationId,
        deviceName: "Radiation Scanner",
        location: snapshot.location,
        status: "online",
      }
    : null;

  const isotopeSummary = useMemo(() => {
    const isotopes = snapshot?.isotopes ?? [];

    const stable = isotopes.filter(
      (isotope) => isotope.status === "stable",
    ).length;

    const unstable = isotopes.filter(
      (isotope) => isotope.status === "unstable",
    ).length;

    return {
      total: isotopes.length,
      stable,
      unstable,
    };
  }, [snapshot?.isotopes]);

  return {
    // Existing properties
    resultCards,
    combinedChartData: [] as CombinedChartPoint[],
    lineChartData: [] as LineChartPoint[],
    device,
    currentCps: metrics.cps,
    currentDoseRate: metrics.doseRate,
    currentBattery: metrics.battery,
    currentTemperature: metrics.temperature,
    currentPressure: metrics.pressure,
    impression: snapshot?.impression ?? [],
    config: null as SimulationConfig | null,
    isRunning: !!snapshot,
    isLoading,
    error,
    scenarioId: snapshot?.scenarioType ?? "",

    // Additional dashboard properties
    simulationId: snapshot?.simulationId ?? "",
    scenarioType: snapshot?.scenarioType ?? "",
    scenarioName: snapshot?.scenarioName ?? "",
    startedAt: snapshot?.startedAt ?? "",
    location: snapshot?.location ?? "",
    units: snapshot?.units ?? {},
    isotopes: snapshot?.isotopes ?? [],
    isotopeSummary,
    environmentSnapshot: snapshot?.environmentSnapshot ?? null,
  };
}
