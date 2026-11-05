"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { UserScenarioConfig } from "@/types/radioanalysis";

const VIDEOS = [
  "/assets/uplink_Videos/timeline_1.mp4",
  "/assets/uplink_Videos/timeline_2.mp4",
] as const;

export default function UplinkV2Page() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [videoIndex, setVideoIndex] = useState(0);
  const [needsUserAction, setNeedsUserAction] = useState(false);

  const completedRef = useRef(false);

  // Verify scan completion and assigned scenario.
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const end = Number(sessionStorage.getItem("radioanalysis_scan_end"));

        if (!end || Date.now() < end) {
          router.replace("/scan/initialize");
          return;
        }

        const response = await fetch("/api/user/scenario", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message ?? "Unable to load scenario");
        }

        const scenario = (data.data ?? data) as UserScenarioConfig;

        if (cancelled) return;

        if (scenario.scenarioType === "negative") {
          router.replace("/scan/live");
          return;
        }

        if (scenario.scenarioType === "positive") {
          setReady(true);
          return;
        }

        throw new Error("Invalid scenario assignment");
      } catch (cause) {
        if (!cancelled) {
          setError(
            cause instanceof Error ? cause.message : "Unable to start video",
          );
        }
      }
    };

    void check();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Attempt muted autoplay for each video.
  useEffect(() => {
    if (!ready) return;

    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    setError("");
    setNeedsUserAction(false);

    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.controls = false;
    video.playsInline = true;

    video.load();

    const playVideo = async () => {
      try {
        await video.play();

        if (!cancelled) {
          setNeedsUserAction(false);
        }
      } catch {
        if (!cancelled) {
          // Autoplay restriction is not a video-loading failure.
          setNeedsUserAction(true);
        }
      }
    };

    void playVideo();

    return () => {
      cancelled = true;
      video.pause();
    };
  }, [ready, videoIndex]);

  // Retry playback directly from a user interaction.
  const handleStartPlayback = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.muted = true;
      video.volume = 0;

      // Call play() directly inside the tap/click handler.
      await video.play();

      setNeedsUserAction(false);
      setError("");
    } catch {
      setNeedsUserAction(true);
      setError("Unable to start playback. Please tap to try again.");
    }
  };

  // Disable page-level keyboard video controls.
  useEffect(() => {
    if (!ready) return;

    const blockedKeys = [
      " ",
      "Spacebar",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "k",
      "j",
      "l",
      "f",
      "m",
      "Home",
      "End",
      "MediaPlayPause",
      "MediaTrackNext",
      "MediaTrackPrevious",
    ];

    const blockKeyboard = (event: KeyboardEvent) => {
      if (blockedKeys.includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("keydown", blockKeyboard, true);

    return () => {
      window.removeEventListener("keydown", blockKeyboard, true);
    };
  }, [ready]);

  // Advance sequentially when playback finishes.
  const handleVideoEnd = () => {
    if (completedRef.current) return;

    if (videoIndex < VIDEOS.length - 1) {
      setVideoIndex((previous) => previous + 1);
      return;
    }

    completedRef.current = true;

    sessionStorage.setItem("radioanalysis_uplink_complete", "1");

    router.replace("/scan/live");
  };

  const handleVideoError = () => {
    setNeedsUserAction(false);
    setError(
      `Unable to load scanner video ${videoIndex + 1}: ${VIDEOS[videoIndex]}`,
    );
  };

  return (
    <main
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black"
      onContextMenu={(event) => event.preventDefault()}
    >
      {ready && (
        <video
          key={videoIndex}
          ref={videoRef}
          src={VIDEOS[videoIndex]}
          autoPlay
          muted
          playsInline
          webkit-playsinline="true"
          controls={false}
          disablePictureInPicture
          disableRemotePlayback
          tabIndex={-1}
          preload="auto"
          controlsList="nodownload noplaybackrate noremoteplayback"
          className="pointer-events-none h-full w-full select-none object-cover"
          onEnded={handleVideoEnd}
          onError={handleVideoError}
          onPlay={() => {
            setNeedsUserAction(false);
            setError("");
          }}
          onVolumeChange={(event) => {
            const video = event.currentTarget;

            if (!video.muted || video.volume !== 0) {
              video.muted = true;
              video.volume = 0;
            }
          }}
        />
      )}

      {/* Mobile browser autoplay fallback */}
      {ready && needsUserAction && !error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 px-6">
          <div className="flex max-w-sm flex-col items-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/50 bg-cyan-400/10">
              <svg
                viewBox="0 0 24 24"
                className="h-8 w-8 text-cyan-400"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>

            <h2 className="mb-2 text-lg font-semibold text-white">
              Scanner Uplink Ready
            </h2>

            <p className="mb-6 text-sm text-gray-300">
              Tap below to start the scanner video sequence.
            </p>

            <button
              type="button"
              onClick={handleStartPlayback}
              className="rounded-lg bg-cyan-500 px-8 py-3 text-sm font-semibold text-black transition hover:bg-cyan-400 active:scale-95"
            >
              Tap to Start
            </button>
          </div>
        </div>
      )}

      {/* Actual video loading/playback error */}
      {error && (
        <div
          role="alert"
          className="absolute inset-0 z-30 flex items-center justify-center bg-black px-6"
        >
          <p className="max-w-lg text-center text-red-400">{error}</p>
        </div>
      )}
    </main>
  );
}
