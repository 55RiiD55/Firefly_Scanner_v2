"use client";

import { useEffect, useState } from "react";
import type { Isotope, UserScenarioIsotope } from "@/types/radioanalysis";

interface RadioisotopeAnalysisProps {
  isotope?: Isotope | null;
  isotopes?: UserScenarioIsotope[];
  isLoading: boolean;
  error: string | null;
}

export default function RadioisotopeAnalysis({
  isotope,
  isotopes,
  isLoading,
  error,
}: RadioisotopeAnalysisProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const entries =
    isotopes ??
    (isotope
      ? [
          {
            id: isotope.id,
            name: isotope.name,
            symbol: isotope.symbol,
            energy: isotope.energy,
            description: isotope.description,
            status: isotope.status?.join(", "),
          },
        ]
      : []);

  useEffect(() => {
    if (entries.length < 2) {
      setActiveIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % entries.length);
    }, 600);

    return () => window.clearInterval(interval);
  }, [entries.length]);

  if (isLoading) {
    return (
      <section className="h-72 w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-6 text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <h2 className="text-lg font-semibold">Radioisotope Analysis</h2>
        <p className="mt-4 text-sm text-gray-500">
          Loading isotope analysis...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="h-72 w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-6 text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <h2 className="text-lg font-semibold">Radioisotope Analysis</h2>
        <p className="mt-4 text-sm text-red-500">{error}</p>
      </section>
    );
  }

  if (entries.length === 0) {
    return (
      <section className="h-72 w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-6 text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <h2 className="text-lg font-semibold">Radioisotope Analysis</h2>
        <p className="mt-4 text-sm text-gray-500">
          No isotope is currently available.
        </p>
      </section>
    );
  }

  const selectedIndex = activeIndex % entries.length;
  const selectedIsotope = entries[selectedIndex];

  const status = selectedIsotope.status?.trim() || "";
  const normalizedStatus = status.toLowerCase();

  const isStable =
    normalizedStatus.includes("stable") &&
    !normalizedStatus.includes("unstable");

  return (
    <section className="h-45 w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-5 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
      <div
        key={selectedIsotope.id ?? selectedIndex}
        className="flex h-full min-h-0 flex-col animate-in fade-in duration-500"
        aria-live="polite"
      >
        <div className="flex min-h-0 flex-1 items-center gap-4">
          {/* Fixed isotope symbol container */}
          <div
            className="flex h-[68px] w-[68px] shrink-0
           items-center justify-center rounded-xl 
           border border-slate-300 bg-slate-50 text-center dark:border-slate-600 dark:bg-slate-800"
          >
            <span className="max-w-full break-words px-1 text-lg font-semibold leading-tight text-purple-900 dark:text-purple-300">
              {selectedIsotope.symbol || "RI"}
            </span>
          </div>

          {/* Isotope information */}
          <div className="min-w-0 flex-1">
            <h3
              title={selectedIsotope.name}
              className="line-clamp-2 break-words text-lg font-semibold leading-6 text-purple-900 dark:text-purple-300"
            >
              {selectedIsotope.name}
            </h3>

            {selectedIsotope.energy && (
              <p
                title={selectedIsotope.energy}
                className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400"
              >
                Energy: {selectedIsotope.energy}
              </p>
            )}

            {status && (
              <div className="mt-2">
                <span
                  className={`inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    isStable
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                  }`}
                >
                  <span className="truncate">{status}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Fixed-height description area */}
        <div className="mt-3 min-h-0 border-t border-slate-200 pt-2 dark:border-slate-700">
          <p
            title={selectedIsotope.description || ""}
            className="line-clamp-2 break-words text-xs leading-5 text-slate-500 dark:text-slate-400"
          >
            {selectedIsotope.description || "No isotope description available."}
          </p>
        </div>
      </div>
    </section>
  );
}
