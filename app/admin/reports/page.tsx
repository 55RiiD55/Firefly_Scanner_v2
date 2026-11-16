"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Eye,
  FileText,
  Radiation,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import ImpressionSection from "@/components/dashboard/ImpressionSection";

import { getImpressions } from "@/lib/impressions";

import type { RadioUser } from "@/types/radioanalysis";

type ResultValue =
  | number
  | {
      value?: number;
      target?: number;
    };

type EnvironmentSnapshot = {
  temperature?: number;
  pressure?: number;
  humidity?: number;
  windSpeed?: number;
  source?: string;
  location?: string;
  resolvedLocation?: string;
  observedAt?: string;
  timezone?: string;
};

type Report = {
  id: string;
  userId: string;
  status: string;
  startedAt: string;
  stoppedAt?: string | null;

  scenarioType?: "positive" | "negative";
  scenarioName?: string;
  location?: string;

  isotopes?: Array<{
    name: string;
    symbol: string;
    status: string;
  }>;

  impression?: {
    title: string;
    description: string;
  } | null;

  stableResults?: Record<string, ResultValue>;

  environmentSnapshot?: EnvironmentSnapshot | null;
};

const surface = "rounded-2xl border border-slate-800 bg-[#101f33]";

function unwrapArray<T>(payload: unknown, key: string): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid API response");
  }

  const data = payload as Record<string, unknown>;

  if (Array.isArray(data[key])) {
    return data[key] as T[];
  }

  if (Array.isArray(data.data)) {
    return data.data as T[];
  }

  if (data.data && typeof data.data === "object") {
    const nested = data.data as Record<string, unknown>;

    if (Array.isArray(nested[key])) {
      return nested[key] as T[];
    }
  }

  throw new Error(`Unable to extract ${key} from API response`);
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function resultNumber(value?: ResultValue) {
  if (typeof value === "number") return value;

  if (value && typeof value === "object") {
    return value.value ?? value.target;
  }

  return undefined;
}

export default function AdminReportsPage() {
  const [users, setUsers] = useState<RadioUser[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  const [selectedUserId, setSelectedUserId] = useState("all");

  const [selectedReportId, setSelectedReportId] = useState("");

  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const [usersResponse, reportsResponse] = await Promise.all([
          fetch("/api/admin/users", {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/admin/reports", {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);

        if (!usersResponse.ok) {
          const errorBody = await usersResponse.text();
          throw new Error(
            `Users API failed (${usersResponse.status}): ${
              errorBody.slice(0, 200) || usersResponse.statusText
            }`,
          );
        }
        if (!reportsResponse.ok) {
          const errorBody = await reportsResponse.text();
          throw new Error(
            `Reports API failed (${reportsResponse.status}): ${
              errorBody.slice(0, 200) || reportsResponse.statusText
            }`,
          );
        }

        const userPayload = await usersResponse.json();
        const reportPayload = await reportsResponse.json();

        const userList = unwrapArray<RadioUser>(userPayload, "users");

        const reportList = unwrapArray<Report>(reportPayload, "reports");

        if (controller.signal.aborted) return;

        setUsers(userList);
        setReports(reportList);
        setError("");
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error ? cause.message : "Unable to load reports",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => controller.abort();
  }, [refreshKey]);

  const userMap = useMemo(
    () =>
      new Map(
        users.map((user) => [String(user.id), user.name || user.username]),
      ),
    [users],
  );

  const filteredReports = useMemo(() => {
    return reports.filter(
      (report) => selectedUserId === "all" || report.userId === selectedUserId,
    );
  }, [reports, selectedUserId]);

  const selectedReport =
    filteredReports.find((report) => report.id === selectedReportId) ??
    filteredReports[0] ??
    null;

  const positiveCount = filteredReports.filter(
    (report) => report.scenarioType === "positive",
  ).length;

  const negativeCount = filteredReports.filter(
    (report) => report.scenarioType === "negative",
  ).length;

  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  async function getPdfBlob(reportId: string): Promise<Blob> {
    const response = await fetch(
      `/api/admin/reports/${encodeURIComponent(reportId)}/pdf`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      const payload = await response.json().catch(() => null);

      throw new Error(
        payload?.message ?? `PDF request failed (${response.status})`,
      );
    }

    const blob = await response.blob();

    if (blob.type !== "application/pdf") {
      throw new Error("The server returned an invalid PDF response.");
    }

    return blob;
  }

  async function handleViewPdf(reportId: string) {
    // Open the tab synchronously to avoid popup blockers.
    const tab = window.open("", "_blank");

    if (!tab) {
      setPdfError("Please allow pop-ups to view the report.");
      return;
    }

    setPdfLoadingId(reportId);
    setPdfError(null);

    try {
      const blob = await getPdfBlob(reportId);
      const objectUrl = URL.createObjectURL(blob);

      tab.location.replace(objectUrl);

      // Keep the object URL alive while the new tab loads.
      // Revoke it when it is no longer needed.
    } catch (error) {
      tab.close();
      setPdfError(
        error instanceof Error ? error.message : "Unable to view PDF",
      );
    } finally {
      setPdfLoadingId(null);
    }
  }

  async function handleDownloadPdf(reportId: string) {
    setPdfLoadingId(reportId);
    setPdfError(null);

    try {
      const blob = await getPdfBlob(reportId);
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `radioanalysis-${reportId}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      setPdfError(
        error instanceof Error ? error.message : "Unable to download PDF",
      );
    } finally {
      setPdfLoadingId(null);
    }
  }

  const metrics = [
    { key: "cps", label: "Count Rate", unit: "CPS" },
    { key: "doseRate", label: "Dose Rate", unit: "µSv/h" },
    { key: "battery", label: "Battery", unit: "%" },
    { key: "temperature", label: "Temperature", unit: "°C" },
    { key: "pressure", label: "Pressure", unit: "hPa" },
    { key: "humidity", label: "Humidity", unit: "%" },
    { key: "windSpeed", label: "Wind Speed", unit: "km/h" },
  ];
  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Simulation Reports</h1>
          <p className="mt-2 text-sm text-slate-400">
            Review stored simulation results and generate PDFs.
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setRefreshKey((key) => key + 1);
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Available Scans",
            value: reports.length,
            icon: FileText,
            color: "text-blue-400",
          },
          {
            label: "Positive",
            value: reports.filter((r) => r.scenarioType === "positive").length,
            icon: Radiation,
            color: "text-amber-400",
          },
          {
            label: "Negative",
            value: reports.filter((r) => r.scenarioType === "negative").length,
            icon: ShieldCheck,
            color: "text-purple-400",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`${surface} p-5`}>
            <Icon size={20} className={color} />
            <p className="mt-3 text-xs text-slate-400">{label}</p>
            <p className="mt-1 text-3xl font-semibold">
              {loading ? "—" : value}
            </p>
          </div>
        ))}
      </div>

      {/* User filter */}
      <div className={`${surface} p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="report-user" className="text-sm text-slate-400">
            User
          </label>

          <select
            id="report-user"
            value={selectedUserId}
            onChange={(event) => {
              setSelectedUserId(event.target.value);
              setSelectedReportId("");
            }}
            className="h-10 min-w-[200px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm outline-none focus:border-blue-500 sm:max-w-sm"
          >
            <option value="all">All Users</option>

            {users
              .filter((user) => user.role === "user")
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.username} (@{user.username})
                </option>
              ))}
          </select>

          <span className="text-xs text-slate-500">
            {filteredReports.length} records
            {" · "}
            {positiveCount} positive
            {" · "}
            {negativeCount} negative
          </span>
        </div>
      </div>

      {/* History + report details */}
      <div className="grid items-start gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className={`${surface} overflow-hidden`}>
          <div className="border-b border-slate-800 p-4">
            <h2 className="font-semibold">Simulation History</h2>
          </div>

          <div className="max-h-[650px] overflow-y-auto p-2">
            {loading ? (
              <p className="p-5 text-sm text-slate-400">
                Loading simulations...
              </p>
            ) : filteredReports.length === 0 ? (
              <p className="p-5 text-sm text-slate-400">
                No simulation records found.
              </p>
            ) : (
              filteredReports.map((report) => {
                const selected = report.id === selectedReport?.id;

                return (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => setSelectedReportId(report.id)}
                    className={`mb-2 w-full rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-transparent hover:bg-slate-800/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {userMap.get(report.userId) ?? "Scanner User"}
                      </span>

                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                          report.scenarioType === "positive"
                            ? "bg-amber-500/10 text-amber-400"
                            : report.scenarioType === "negative"
                              ? "bg-purple-500/10 text-purple-400"
                              : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {report.scenarioType ?? "Unknown"}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-400">
                      {formatDate(report.startedAt)}
                    </p>

                    <p className="mt-2 truncate font-mono text-[11px] text-slate-500">
                      {report.id}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className={`${surface} min-w-0 p-5 sm:p-6`}>
          {!selectedReport ? (
            <div className="py-16 text-center text-sm text-slate-500">
              Select a simulation to view its results.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Simulation Details</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    {userMap.get(selectedReport.userId) ??
                      selectedReport.userId}
                  </p>
                </div>

                <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                  {selectedReport.status}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  [
                    "Scenario",
                    selectedReport.scenarioName ??
                      selectedReport.scenarioType ??
                      "—",
                  ],
                  ["Started", formatDate(selectedReport.startedAt)],
                  [
                    "Location",
                    selectedReport.environmentSnapshot?.resolvedLocation ??
                      selectedReport.environmentSnapshot?.location ??
                      selectedReport.location ??
                      "—",
                  ],
                  ["Simulation ID", selectedReport.id],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="min-w-0 rounded-xl bg-slate-950/60 p-3"
                  >
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 break-all text-sm">{value}</p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold">Recorded Results</h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  {metrics.map(({ key, label, unit }) => {
                    const environment = selectedReport.environmentSnapshot;

                    // Environmental snapshot takes priority over simulation results.
                    const environmentValue =
                      key === "temperature"
                        ? environment?.temperature
                        : key === "pressure"
                          ? environment?.pressure
                          : key === "humidity"
                            ? environment?.humidity
                            : key === "windSpeed"
                              ? environment?.windSpeed
                              : undefined;

                    const value =
                      environmentValue ??
                      resultNumber(selectedReport.stableResults?.[key]);

                    return (
                      <div
                        key={key}
                        className="rounded-xl border border-slate-800 p-4"
                      >
                        <p className="text-xs text-slate-400">{label}</p>

                        <p className="mt-2 text-xl font-semibold">
                          {value === undefined ? "—" : `${value} ${unit}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Environmental Data Source */}
              {selectedReport.environmentSnapshot && (
                <p className="text-xs text-slate-500">
                  Environmental data source:{" "}
                  {selectedReport.environmentSnapshot.source ?? "—"}
                  {" · "}
                  Observed:{" "}
                  {formatDate(
                    selectedReport.environmentSnapshot.observedAt ?? "",
                  )}
                </p>
              )}

              <div>
                <h3 className="mb-2 text-sm font-semibold">Radioisotopes</h3>

                {selectedReport.isotopes?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedReport.isotopes.map((isotope, index) => (
                      <span
                        key={`${isotope.symbol}-${index}`}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300"
                      >
                        {isotope.name} ({isotope.symbol}){" · "}
                        {isotope.status}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    No isotopes recorded.
                  </p>
                )}
              </div>

              <div className="mt-5">
                <ImpressionSection
                  impressions={getImpressions(selectedReport.impression)}
                  showSpeechControls={false}
                />
              </div>

              <div className="flex flex-wrap gap-3 border-t border-slate-800 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedReport) {
                      handleViewPdf(selectedReport.id);
                    }
                  }}
                  disabled={
                    !selectedReport || pdfLoadingId === selectedReport.id
                  }
                >
                  View PDF
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedReport) {
                      handleDownloadPdf(selectedReport.id);
                    }
                  }}
                  disabled={
                    !selectedReport || pdfLoadingId === selectedReport.id
                  }
                >
                  Download PDF
                </button>

                {pdfError && (
                  <p role="alert" className="text-sm text-red-400">
                    {pdfError}
                  </p>
                )}

                {workingId === selectedReport.id && (
                  <span className="self-center text-xs text-slate-400">
                    Generating PDF...
                  </span>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
