"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

import EndlessEEGChart from "@/components/dashboard/SpectrumChart";
import RadioisotopeAnalysis from "@/components/dashboard/RadioisotopeAnalysis";
import GammaIndexBarChart from "@/components/dashboard/GammaIndexBarChart";
import LiveDiversityChart from "@/components/dashboard/LiveDiversityChart";

import { gammaIndexData } from "@/data/gammaIndexData";

import { useLiveWeather } from "@/hooks/useLiveWeather";

import ImpressionSection from "@/components/dashboard/ImpressionSection";

import { getImpressions } from "@/lib/impressions";

import CompactTrendChart from "@/components/dashboard/CompactTrendChart";

import ThemeSwitcher from "@/components/theme/ThemeSwitcher";

import LiveSpectrumSweep from "@/components/dashboard/LiveSpectrumSweep";

import type {
  UserScenarioConfig,
  UserScenarioIsotope,
} from "@/types/radioanalysis";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

type Reading = {
  timestamp: string;
  elapsedSeconds: number;
  cps: number;
  doseRate: number;
  battery: number;
  batteryStatus?: "charging" | "normal" | "low" | "critical" | "depleted";
  charging?: boolean;
  temperature: number;
  pressure: number;
};

type ScenarioDetails = UserScenarioConfig & {
  deviceName?: string;
  device?: {
    name?: string;
    model?: string;
  };
  location?:
    | string
    | {
        name?: string;
        address?: string;
      };
};

const card =
  "min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/70";

function formatNumber(value: number | undefined, digits = 1) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(digits)
    : "—";
}

function SummaryCard({
  label,
  value,
  unit,
  symbol,
  accent,
  children,
}: {
  label: string;
  value?: string;
  unit?: string;
  symbol: string;
  accent: string;
  children?: React.ReactNode;
}) {
  return (
    <article className={`${card} flex h-full flex-col p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl font-bold"
            style={{
              color: accent,
              backgroundColor: `${accent}18`,
            }}
            aria-hidden="true"
          >
            {symbol}
          </div>

          <h2 className="text-sm font-medium text-slate-300">{label}</h2>
        </div>

        <span className="flex shrink-0 items-center gap-1.5 text-xs text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live
        </span>
      </div>

      {children ?? (
        <>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {value ?? "—"}
            </span>
            {unit && (
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {unit}
              </span>
            )}
          </div>
        </>
      )}
    </article>
  );
}

function DeviceField({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex h-full min-h-[66px] min-w-0 flex-col justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/60 px-3.5 py-2.5">
      <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
        {label}
      </p>

      <p
        className={`mt-1 truncate text-sm font-semibold ${
          highlight
            ? "text-cyan-700 dark:text-cyan-400"
            : "text-slate-900 dark:text-slate-100"
        }`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

export default function LiveScanner() {
  const [reading, setReading] = useState<Reading | null>(null);

  const [error, setError] = useState("");

  const [scenario, setScenario] = useState<ScenarioDetails | null>(null);

  const showRadiationCharts = scenario?.scenarioType === "positive";

  const [isotopes, setIsotopes] = useState<UserScenarioIsotope[]>([]);

  const [isotopeLoading, setIsotopeLoading] = useState(true);

  const [isotopeError, setIsotopeError] = useState<string | null>(null);

  // Load the user's admin-assigned scenario.
  useEffect(() => {
    let cancelled = false;

    const loadScenario = async () => {
      try {
        const response = await fetch("/api/user/scenario", {
          cache: "no-store",
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to load scenario");
        }

        const data = (payload.data ?? payload) as ScenarioDetails;

        if (cancelled) return;

        setScenario(data);

        setIsotopes(Array.isArray(data.isotopes) ? data.isotopes : []);

        setIsotopeError(null);
      } catch (cause) {
        if (!cancelled) {
          setIsotopeError(
            cause instanceof Error ? cause.message : "Unable to load isotopes",
          );
        }
      } finally {
        if (!cancelled) {
          setIsotopeLoading(false);
        }
      }
    };

    void loadScenario();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let closed = false;

    const loadReading = async () => {
      try {
        const response = await fetch("/api/simulations/active", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || data.status !== "running") {
          throw new Error(data.message ?? "No active simulation");
        }

        if (closed) return;

        setReading(data.values);
        setError("");
      } catch (cause) {
        if (!closed) {
          setError(
            cause instanceof Error ? cause.message : "Unable to load readings",
          );
        }
      }
    };

    void loadReading();

    const interval = window.setInterval(() => void loadReading(), 1000);

    return () => {
      closed = true;
      window.clearInterval(interval);
    };
  }, []);

  const location = scenario?.location?.trim() ?? "";

  const {
    weather,
    loading: weatherLoading,
    error: weatherError,
  } = useLiveWeather(location);

  const deviceName =
    scenario?.deviceName ??
    scenario?.device?.name ??
    scenario?.device?.model ??
    "Radio Isotope Identifier Device";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        {/* Page header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              RIID - Radio Isotope Identifier Device
            </h1>

            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              RADIATION AREA MONITOR
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-800 bg-emerald-950/40 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              {reading && !error ? "Status: Online" : "Connecting"}
            </div>
            <DashboardHeader />
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-800 bg-red-950/30 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {/* Row 1: Three summary cards */}
        <section
          aria-label="Live radiation readings"
          className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3"
        >
          <SummaryCard label="Count Rate" symbol="∿" accent="#3B82F6">
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {reading ? formatNumber(reading.cps, 0) : "—"}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                CPS
              </span>
            </div>

            <div className="mt-auto">
              <CompactTrendChart
                value={reading?.cps ?? NaN}
                unit="CPS"
                color="#010101"
                precision={0}
                min={scenario?.cps?.min}
                max={scenario?.cps?.max}
              />
            </div>
          </SummaryCard>

          <SummaryCard label="Dose Rate" symbol="☢" accent="#F59E0B">
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {reading ? formatNumber(reading.doseRate, 3) : "—"}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                µSv/h
              </span>
            </div>

            <div className="mt-auto">
              <CompactTrendChart
                value={reading?.doseRate ?? NaN}
                unit="µSv/h"
                color="#000000"
                precision={3}
                min={scenario?.doseRate?.min}
                max={scenario?.doseRate?.max}
              />
            </div>
          </SummaryCard>

          <SummaryCard label="Isotopes" symbol="⚛" accent="#A855F7">
            <div className="mt-4 min-w-0 flex-1">
              <RadioisotopeAnalysis
                isotopes={isotopes}
                isLoading={isotopeLoading}
                error={isotopeError}
              />
            </div>
          </SummaryCard>
        </section>

        {/* Row 2: Full-width device information */}

        <section className={`${card} p-4 sm:p-5`}>
          {/* Header */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Device Information
            </h2>

            <span
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                reading && !error
                  ? "border-emerald-800 bg-emerald-950/50 text-emerald-400"
                  : "border-slate-700 bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  reading && !error
                    ? "animate-pulse bg-emerald-400"
                    : "bg-slate-500"
                }`}
              />
              {reading && !error ? "Live" : "Offline"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12">
            {/* Device Name */}
            <div className="min-w-0 lg:col-span-6">
              <DeviceField label="Device Name" value={deviceName} highlight />
            </div>

            {/* Location */}
            <div className="min-w-0 lg:col-span-6">
              <DeviceField
                label="Location"
                value={(weather?.location ?? location) || "Not configured"}
                highlight
              />
            </div>

            {/* Weather Information */}
            <div className="min-w-0 lg:col-span-3">
              <DeviceField
                label="Temperature"
                value={weather ? `${weather.temperature.toFixed(1)} °C` : "—"}
              />
            </div>

            <div className="min-w-0 lg:col-span-3">
              <DeviceField
                label="Pressure"
                value={weather ? `${weather.pressure.toFixed(0)} hPa` : "—"}
              />
            </div>

            <div className="min-w-0 lg:col-span-3">
              <DeviceField
                label="Humidity"
                value={weather ? `${weather.humidity}%` : "—"}
              />
            </div>

            <div className="min-w-0 lg:col-span-3">
              <DeviceField
                label="Wind Speed"
                value={weather ? `${weather.windSpeed.toFixed(1)} km/h` : "—"}
              />
            </div>

            {/* Battery */}
            <div className="min-w-0 sm:col-span-2 lg:col-span-12">
              <div className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Battery
                  </span>

                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {reading ? `${formatNumber(reading.battery, 0)}%` : "—"}
                  </span>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-[width] duration-500 ${
                      (reading?.battery ?? 100) <= 20
                        ? "bg-red-500"
                        : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, reading?.battery ?? 0),
                      )}%`,
                    }}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-medium ${
                      reading?.batteryStatus === "critical" ||
                      reading?.batteryStatus === "depleted"
                        ? "text-red-400"
                        : reading?.batteryStatus === "low"
                          ? "text-amber-400"
                          : "text-emerald-400"
                    }`}
                  >
                    {reading?.charging
                      ? "Charging"
                      : reading?.batteryStatus === "critical"
                        ? "Critical"
                        : reading?.batteryStatus === "depleted"
                          ? "Depleted"
                          : reading?.batteryStatus === "low"
                            ? "Low Battery"
                            : "Normal"}
                  </span>

                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {reading ? `${formatNumber(reading.battery, 0)}%` : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Compact weather status */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                weatherError
                  ? "bg-red-400"
                  : weather
                    ? "bg-sky-400"
                    : "bg-slate-500"
              }`}
            />

            {weatherLoading && !weather
              ? "Fetching weather information..."
              : weatherError
                ? `Weather unavailable: ${weatherError}`
                : weather
                  ? `Weather observed: ${weather.observedAt} (${weather.timezone})`
                  : "Waiting for weather information"}
          </div>
        </section>

        {/* Rows 3–5: Radiation Charts - Positive Scenario Only */}
        {showRadiationCharts && (
          <>
            {/* Row 3: Two equal-width charts */}
            <section className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
              {/* Endless EEG / Spectrum Chart */}
              <div className={`${card} min-w-0 p-3 sm:p-4`}>
                <div className="min-w-0 [&>div]:!mt-0 [&>div]:!max-w-none">
                  <EndlessEEGChart />
                </div>
              </div>

              {/* Live Spectrum Sweep */}
              <div className={`${card} min-w-0 p-3 sm:p-4`}>
                <div className="min-w-0 [&>div]:!mt-0 [&>div]:!max-w-none">
                  <LiveSpectrumSweep
                    durationSeconds={30}
                    flatSeconds={5}
                    peakSeconds={20}
                    height={280}
                    color="#2563eb"
                  />
                </div>
              </div>
            </section>

            {/* Row 4: Radiation Diversity Analysis */}
            <section className={`${card} p-4 sm:p-5`}>
              <div className="mb-4">
                <h2 className="text-base font-semibold">
                  Radiation Diversity Analysis
                </h2>

                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Alpha, Beta and Gamma distributions
                </p>
              </div>

              <div className="min-w-0 overflow-x-auto">
                <LiveDiversityChart live intervalMs={1200} maxPoints={300} />
              </div>
            </section>

            {/* Row 5: Gamma Index Analysis */}
            <section className={`${card} p-4 sm:p-5`}>
              <h2 className="mb-4 text-base font-semibold">
                Gamma Index Analysis
              </h2>

              <div className="min-w-0 overflow-x-auto">
                <GammaIndexBarChart data={gammaIndexData} height={350} />
              </div>
            </section>
          </>
        )}

        {/* Row 6: Impression Summary */}
        <ImpressionSection impressions={getImpressions(scenario?.impression)} />

        {/* Row 7: Results navigation */}
        <footer className="flex flex-col items-start justify-between gap-4 border-t border-slate-800 pt-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold">Results</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              View the detailed scanner results and analysis.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-slate-900 dark:text-white transition-colors hover:bg-blue-500"
          >
            View Results
            <span aria-hidden="true">→</span>
          </Link>
        </footer>
      </div>
    </main>
  );
}
