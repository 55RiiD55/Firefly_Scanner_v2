"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DeviceStatus from "@/components/dashboard/DeviceStatus";
import ImpressionSection from "@/components/dashboard/ImpressionSection";
import ThemeSwitcher from "@/components/theme/ThemeSwitcher";

import { useDashboardSimulation } from "@/hooks/useDashboardSimulation";
import { getImpressions } from "@/lib/impressions";

const formatNumber = (value: number | null | undefined, digits = 1) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
};

const formatDate = (value: string) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function DashboardPage() {
  const results = useDashboardSimulation();
  const [isotopeSearch, setIsotopeSearch] = useState("");
  const [isotopeFilter, setIsotopeFilter] = useState<
    "all" | "stable" | "unstable"
  >("all");

  const impressions = getImpressions(results.impression);

  const filteredIsotopes = useMemo(() => {
    const query = isotopeSearch.trim().toLowerCase();

    return results.isotopes.filter((isotope) => {
      const matchesStatus =
        isotopeFilter === "all" || isotope.status === isotopeFilter;

      const matchesSearch =
        !query ||
        isotope.name.toLowerCase().includes(query) ||
        isotope.symbol.toLowerCase().includes(query) ||
        isotope.energy.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [results.isotopes, isotopeSearch, isotopeFilter]);

  const stablePercentage =
    results.isotopeSummary.total > 0
      ? (results.isotopeSummary.stable / results.isotopeSummary.total) * 100
      : 0;

  const unstablePercentage =
    results.isotopeSummary.total > 0
      ? (results.isotopeSummary.unstable / results.isotopeSummary.total) * 100
      : 0;

  const metrics = [
    {
      label: "Count Rate",
      value: formatNumber(results.currentCps, 0),
      unit: results.units.cps ?? "CPS",
      description: "Recorded counts per second",
      accent: "bg-blue-500",
      icon: "⌁",
    },
    {
      label: "Dose Rate",
      value: formatNumber(results.currentDoseRate, 2),
      unit: results.units.doseRate ?? "µSv/h",
      description: "Recorded radiation dose rate",
      accent: "bg-rose-500",
      icon: "◉",
    },
    {
      label: "Battery Level",
      value: formatNumber(results.currentBattery, 0),
      unit: results.units.battery ?? "%",
      description: "Recorded device battery",
      accent: "bg-emerald-500",
      icon: "▰",
    },
  ];

  const environment = results.environmentSnapshot;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900 dark:bg-[#080d18] dark:text-slate-100">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Application header */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <DashboardHeader />
          <ThemeSwitcher />
        </div>

        {/* Page heading */}
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
              Report
            </p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              RIID Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Scan results, environmental conditions and isotope analysis.
            </p>
          </div>

          <Link
            href="/scan/live"
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <span aria-hidden="true">←</span>
            Return to Live Scanner
          </Link>
        </div>

        {/* Loading */}
        {results.isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            Loading scan dashboard...
          </div>
        )}

        {/* Error */}
        {results.error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-300 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
          >
            <p className="font-semibold">Unable to load scan results</p>
            <p className="mt-1">{results.error}</p>
          </div>
        )}

        {!results.isLoading && !results.error && (
          <div className="space-y-6">
            {/* Scan overview */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {results.scenarioName || "Scan Results"}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    {results.location || "Location unavailable"}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:min-w-[440px]">
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Scan started
                    </p>
                    <p className="mt-2 text-sm font-semibold">
                      {formatDate(results.startedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Radiation readings */}
            <section>
              <div className="mb-4">
                <h2 className="text-lg font-bold">Radiation Readings</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Stable values recorded for this simulation.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {metrics.map((metric) => (
                  <article
                    key={metric.label}
                    className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div
                      className={`absolute inset-y-0 left-0 w-1 ${metric.accent}`}
                    />

                    <div className="flex items-start justify-between">
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {metric.label}
                      </p>

                      <span
                        className="text-2xl text-slate-400"
                        aria-hidden="true"
                      >
                        {metric.icon}
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap items-baseline gap-2">
                      <span className="text-4xl font-bold tracking-tight">
                        {metric.value}
                      </span>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {metric.unit}
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                      {metric.description}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            {/* Environmental conditions */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-lg font-bold">
                    Environmental Conditions
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Weather snapshot associated with this scan.
                  </p>
                </div>

                {environment && (
                  <span className="w-fit rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                    Source: {environment.source}
                  </span>
                )}
              </div>

              {environment ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        label: "Temperature",
                        value: formatNumber(environment.temperature, 1),
                        unit: results.units.temperature ?? "°C",
                        icon: "🌡️",
                      },
                      {
                        label: "Atmospheric Pressure",
                        value: formatNumber(environment.pressure, 1),
                        unit: results.units.pressure ?? "hPa",
                        icon: "◉",
                      },
                      {
                        label: "Humidity",
                        value: formatNumber(environment.humidity, 0),
                        unit: "%",
                        icon: "💧",
                      },
                      {
                        label: "Wind Speed",
                        value: formatNumber(environment.windSpeed, 1),
                        unit: "",
                        icon: "〰",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {item.label}
                          </p>
                          <span aria-hidden="true">{item.icon}</span>
                        </div>

                        <p className="mt-3 text-2xl font-bold">
                          {item.value}
                          <span className="ml-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                            {item.unit}
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-col gap-1 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:flex-row sm:justify-between">
                    <span>Weather location: {environment.location}</span>
                    <span>Observed: {formatDate(environment.observedAt)}</span>
                  </div>
                </>
              ) : (
                <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                  No environmental snapshot is available for this scan.
                </p>
              )}
            </section>

            {/* Isotope analysis */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h2 className="text-lg font-bold">Isotope Analysis</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Isotope records included in the scan response.
                  </p>
                </div>

                <span className="w-fit rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                  {results.isotopeSummary.total} isotopes
                </span>
              </div>

              {/* Isotope counts */}
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Total Isotopes
                  </p>
                  <p className="mt-2 text-3xl font-bold">
                    {results.isotopeSummary.total}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-500/10">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Stable
                  </p>
                  <p className="mt-2 text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                    {results.isotopeSummary.stable}
                  </p>
                </div>

                <div className="rounded-xl bg-rose-50 p-4 dark:bg-rose-500/10">
                  <p className="text-xs font-medium text-rose-700 dark:text-rose-400">
                    Unstable
                  </p>
                  <p className="mt-2 text-3xl font-bold text-rose-700 dark:text-rose-400">
                    {results.isotopeSummary.unstable}
                  </p>
                </div>
              </div>

              {/* Stable / unstable distribution */}
              {results.isotopeSummary.total > 0 && (
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Isotope catalogue distribution</span>
                    <span>{results.isotopeSummary.total} records</span>
                  </div>

                  <div
                    className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                    role="img"
                    aria-label={`${results.isotopeSummary.stable} stable and ${results.isotopeSummary.unstable} unstable isotope records`}
                  >
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${stablePercentage}%` }}
                    />
                    <div
                      className="h-full bg-rose-500"
                      style={{ width: `${unstablePercentage}%` }}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      Stable ({stablePercentage.toFixed(1)}%)
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                      Unstable ({unstablePercentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )}

              {/* Search and filters */}
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <input
                  type="search"
                  value={isotopeSearch}
                  onChange={(event) => setIsotopeSearch(event.target.value)}
                  placeholder="Search isotope name, symbol or energy..."
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950"
                />

                <select
                  value={isotopeFilter}
                  onChange={(event) =>
                    setIsotopeFilter(
                      event.target.value as "all" | "stable" | "unstable",
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950"
                  aria-label="Filter isotopes by status"
                >
                  <option value="all">All isotopes</option>
                  <option value="stable">Stable</option>
                  <option value="unstable">Unstable</option>
                </select>
              </div>

              {/* Isotope list */}
              <div className="mt-4 space-y-3">
                {filteredIsotopes.map((isotope) => (
                  <article
                    key={isotope.id}
                    className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{isotope.name}</h3>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            {isotope.symbol.trim()}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          {isotope.description}
                        </p>

                        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold">Energy: </span>
                          {isotope.energy}
                        </p>
                      </div>

                      <span
                        className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                          isotope.status === "stable"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                        }`}
                      >
                        {isotope.status}
                      </span>
                    </div>
                  </article>
                ))}

                {filteredIsotopes.length === 0 && (
                  <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                    No isotopes match your search.
                  </p>
                )}
              </div>
            </section>

            {/* Admin-configured impressions */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-bold">Radiation Impression</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Assessment and safety instructions from the configured scan
                  report.
                </p>
              </div>

              <ImpressionSection impressions={impressions} />
            </section>

            {/* Footer metadata */}
          </div>
        )}
      </div>
    </main>
  );
}
