"use client";

import Image from "next/image";
import { SubmitEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type LoginStep = "credentials" | "otp";

export default function LoginPage() {
  const [step, setStep] = useState<LoginStep>("credentials");

  const [challengeToken, setChallengeToken] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [resendTimer, setResendTimer] = useState(60);

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const router = useRouter();

  // OTP resend countdown
  useEffect(() => {
    if (step !== "otp" || resendTimer <= 0) return;

    const timer = window.setInterval(() => {
      setResendTimer((previous) => previous - 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [step, resendTimer]);

  // -----------------------------
  // STEP 1: USERNAME + PASSWORD
  // -----------------------------
  const handleCredentialsSubmit = async (
    event: SubmitEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setErrorMessage("");

    if (!username.trim() || !password.trim()) {
      setErrorMessage("Please enter your username and password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to verify credentials.");
      }

      /*
       * OTP is disabled for this user.
       *
       * The login API has already created the
       * authenticated session cookie.
       */
      if (data.requiresOtp === false) {
        router.push(data.role === "admin" ? "/admin" : "/scan");
        router.refresh();
        return;
      }

      if (!data.challengeToken)
        throw new Error("Unable to start OTP verification.");
      setChallengeToken(data.challengeToken);
      setOtp(["", "", "", "", "", ""]);
      setResendTimer(60);
      setStep("otp");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to verify your credentials.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // -----------------------------
  // STEP 3: OTP HANDLING
  // -----------------------------
  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;

    const updatedOtp = [...otp];

    // Handle mobile/browser autofill with multiple digits
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");

      digits.forEach((digit, digitIndex) => {
        if (index + digitIndex < 6) {
          updatedOtp[index + digitIndex] = digit;
        }
      });

      setOtp(updatedOtp);

      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    updatedOtp[index] = value;
    setOtp(updatedOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();

    const pastedData = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pastedData) return;

    const digits = pastedData.split("");
    const updatedOtp = ["", "", "", "", "", ""];

    digits.forEach((digit, index) => {
      updatedOtp[index] = digit;
    });

    setOtp(updatedOtp);

    const focusIndex = Math.min(digits.length, 5);
    otpRefs.current[focusIndex]?.focus();
  };

  const handleOtpSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const enteredOtp = otp.join("");

    if (enteredOtp.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit OTP.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          otp: enteredOtp,
          challengeToken,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Invalid OTP.");
      }

      router.push(data.role === "admin" ? "/admin" : "/scan");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to verify OTP.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // -----------------------------
  // RESEND OTP
  // -----------------------------
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;

    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challengeToken,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to resend OTP.");
      }
      setChallengeToken(data.challengeToken);

      setOtp(["", "", "", "", "", ""]);
      setResendTimer(60);

      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to resend OTP.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const stepNumber = step === "credentials" ? 1 : 2;

  return (
    <main className="relative min-h-screen overflow-hidden bg-black">
      {/* Background Video */}
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/assets/welcome_page.mp4"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Background overlays */}
      <div className="absolute inset-0 bg-black/55" />

      <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/30 to-black/80" />

      {/* Main content */}
      <div className="relative z-10 min-h-screen w-full">
        {/* Animated Logo */}

        <div className="absolute left-5 top-5 z-20 sm:left-8 sm:top-8 lg:left-20 lg:top-10">
          <Image
            className="h-auto animate-spin ease-linear [animation-duration:15s]"
            src="/assets/logo_1.png"
            alt="Logo"
            width={120}
            height={120}
          />
        </div>
        <div className="w-full overflow-hidden border-y-2 border-rgba(48, 48, 48)">
          {/* 1. We inject the keyframes definition directly into a hidden style tag */}
          <style>{`
        @keyframes stripeMove {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>

          {/* 2. We apply the animation name using inline styles instead of Tailwind brackets */}
          <div
            className="h-8 w-[200%]"
            style={{
              animation: "stripeMove 30s linear infinite",
              backgroundImage: `repeating-linear-gradient(
            45deg,
            #facc15,       
            #facc15 20px,
            #303030 20px,
            #303030 40px
          )`,
            }}
          />
        </div>

        {/* Page content */}
        <section
          className="
            flex min-h-screen w-full flex-col items-center justify-center
            gap-8 px-5 py-28
            md:px-10
            lg:flex-row lg:justify-between lg:gap-16 lg:px-16 lg:py-20
            xl:gap-24 xl:px-24
          "
        >
          {/* Left content */}
          <div className="w-full max-w-xl text-center lg:text-left">
            <h1
              className="
                text-3xl font-semibold uppercase leading-tight
                tracking-[0.08em] text-white
                sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl
              "
            >
              Radioactivity and
              <br />
              Radioisotope Analysis
            </h1>
          </div>

          {/* Authentication card */}
          <div
            className="
              w-full max-w-md rounded-3xl
              border border-white/20
              bg-white/[0.08]
              p-6
              shadow-[0_25px_80px_rgba(0,0,0,0.55)]
              backdrop-blur-2xl
              sm:p-8
              lg:max-w-[430px] lg:p-10
              xl:max-w-[460px]
            "
          >
            {/* Step indicator */}
            <div className="mb-8 flex items-center justify-center gap-2">
              {[1, 2].map((item) => (
                <div
                  key={item}
                  className={`h-1.5 rounded-full transition-all ${
                    item === stepNumber
                      ? "w-8 bg-white"
                      : item < stepNumber
                        ? "w-5 bg-white/60"
                        : "w-5 bg-white/20"
                  }`}
                />
              ))}
            </div>

            {/* Error */}
            {errorMessage && (
              <div
                role="alert"
                className="
                  mb-5 rounded-xl
                  border border-red-400/30
                  bg-red-500/10
                  px-4 py-3
                  text-center text-sm text-red-200
                "
              >
                {errorMessage}
              </div>
            )}

            {/* =====================================
                STEP 1: USERNAME + PASSWORD
            ====================================== */}
            {step === "credentials" && (
              <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                <div className="mb-8 text-center">
                  <p className="mb-3 text-xs font-medium uppercase tracking-[0.35em] text-white/50">
                    Step 1 of 2
                  </p>

                  <h2 className="text-2xl font-semibold text-white sm:text-3xl">
                    Welcome Back
                  </h2>

                  <p className="mt-3 text-sm text-white/55">
                    Enter your credentials to continue.
                  </p>
                </div>

                {/* Username */}
                <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-medium text-white/80"
                  >
                    Username
                  </label>

                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    className="
                      h-12 w-full rounded-xl
                      border border-white/15
                      bg-black/20
                      px-4 text-sm text-white
                      outline-none
                      placeholder:text-white/30
                      transition
                      focus:border-white/40
                      focus:bg-black/30
                      focus:ring-2 focus:ring-white/10
                    "
                  />
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-white/80"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="
                        h-12 w-full rounded-xl
                        border border-white/15
                        bg-black/20
                        px-4 pr-12 text-sm text-white
                        outline-none
                        placeholder:text-white/30
                        transition
                        focus:border-white/40
                        focus:bg-black/30
                        focus:ring-2 focus:ring-white/10
                      "
                    />

                    <button
                      type="button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((previous) => !previous)}
                      className="
                        absolute right-3 top-1/2 -translate-y-1/2
                        p-2 text-white/40
                        transition hover:text-white
                      "
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="
                    flex h-12 w-full items-center justify-center
                    rounded-xl bg-white
                    text-sm font-semibold text-black
                    transition-all
                    hover:bg-white/90
                    active:scale-[0.99]
                    disabled:cursor-not-allowed disabled:opacity-60
                  "
                >
                  {isLoading ? "Verifying..." : "Continue"}
                </button>
              </form>
            )}

            {/* =====================================
                STEP 3: OTP VERIFICATION
            ====================================== */}
            {step === "otp" && (
              <form onSubmit={handleOtpSubmit} className="space-y-6">
                <div className="text-center">
                  <p className="mb-3 text-xs font-medium uppercase tracking-[0.35em] text-white/50">
                    Step 2 of 2
                  </p>

                  <h2 className="text-2xl font-semibold text-white sm:text-3xl">
                    Verify OTP
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-white/55">
                    Enter the 6-digit code sent to the configured email address.
                  </p>
                </div>

                {/* OTP inputs */}
                <div className="flex justify-center gap-2 sm:gap-3">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(element) => {
                        otpRefs.current[index] = element;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(event) =>
                        handleOtpChange(event.target.value, index)
                      }
                      onKeyDown={(event) => handleOtpKeyDown(event, index)}
                      onPaste={handleOtpPaste}
                      aria-label={`OTP digit ${index + 1}`}
                      className="
                        h-11 w-10 rounded-lg
                        border border-white/20
                        bg-black/20
                        text-center text-lg font-semibold text-white
                        outline-none
                        transition
                        focus:border-white/60
                        focus:ring-2 focus:ring-white/10
                        sm:h-12 sm:w-12
                      "
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="
                    flex h-12 w-full items-center justify-center
                    rounded-xl bg-white
                    text-sm font-semibold text-black
                    transition-all
                    hover:bg-white/90
                    active:scale-[0.99]
                    disabled:cursor-not-allowed disabled:opacity-60
                  "
                >
                  {isLoading ? "Verifying..." : "Verify & Sign In"}
                </button>

                {/* Resend */}
                <div className="text-center">
                  {resendTimer > 0 ? (
                    <p className="text-sm text-white/45">
                      Resend OTP in{" "}
                      <span className="font-medium text-white/70">
                        {resendTimer}s
                      </span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isLoading}
                      className="
                        text-sm font-medium text-white/70
                        transition hover:text-white
                        disabled:opacity-50
                      "
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage("");
                    setStep("credentials");
                  }}
                  className="
                    w-full py-1 text-sm text-white/50
                    transition hover:text-white
                  "
                >
                  ← Back to login
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
