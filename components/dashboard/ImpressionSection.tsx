"use client";

import { useEffect, useMemo, useState } from "react";
import { Volume2, Pause, Play, Square } from "lucide-react";
import ImpressionFormattedText, {
  plainImpressionText,
} from "@/components/dashboard/ImpressionFormattedText";

export interface ImpressionEntry {
  title: string;
  description: string;
}

interface ImpressionSectionProps {
  impressions: ImpressionEntry[];
}

export default function ImpressionSection({
  impressions,
}: ImpressionSectionProps) {
  const [speechStatus, setSpeechStatus] = useState<
    "idle" | "playing" | "paused"
  >("idle");

  const speechText = useMemo(
    () =>
      impressions
        .map(
          (item, index) =>
            `${plainImpressionText(item.title)}. ${plainImpressionText(item.description)}`,
        )
        .join(". "),
    [impressions],
  );

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }
    };
  }, []);

  function playSpeech() {
    if (!("speechSynthesis" in window)) return;

    const synthesis = window.speechSynthesis;

    if (synthesis.paused && speechStatus === "paused") {
      synthesis.resume();
      setSpeechStatus("playing");
      return;
    }

    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(
      `Impression Summary. ${speechText}`,
    );

    utterance.lang = "en-IN";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onend = () => setSpeechStatus("idle");
    utterance.onerror = () => setSpeechStatus("idle");

    synthesis.speak(utterance);
    setSpeechStatus("playing");
  }

  function pauseSpeech() {
    window.speechSynthesis.pause();
    setSpeechStatus("paused");
  }

  function stopSpeech() {
    window.speechSynthesis.cancel();
    setSpeechStatus("idle");
  }

  if (!impressions.length) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 text-slate-950">
        <h2 className="font-semibold">Impression Summary</h2>
        <p className="mt-3 text-sm text-slate-500">
          No impression entries configured.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-gray-200 p-5 text-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Impression Summary</h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={playSpeech}
            aria-label={
              speechStatus === "paused"
                ? "Resume reading"
                : "Read all impressions aloud"
            }
            className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700 hover:bg-slate-100"
          >
            {speechStatus === "paused" ? (
              <Play size={17} />
            ) : (
              <Volume2 size={17} />
            )}
          </button>

          {speechStatus === "playing" && (
            <button
              type="button"
              onClick={pauseSpeech}
              aria-label="Pause reading"
              className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700 hover:bg-slate-100"
            >
              <Pause size={17} />
            </button>
          )}

          {speechStatus !== "idle" && (
            <button
              type="button"
              onClick={stopSpeech}
              aria-label="Stop reading"
              className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700 hover:bg-slate-100"
            >
              <Square size={17} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {impressions.map((item, index) => (
          <article
            key={index}
            className="border-b border-slate-200 pb-4 last:border-b-0 last:pb-0"
          >
            <h3 className="text-sm font-bold text-slate-900 uppercase">
              <ImpressionFormattedText value={item.title} inline />
            </h3>

            <div className="mt-2 text-sm leading-6 text-slate-900">
              <ImpressionFormattedText value={item.description} inline />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
