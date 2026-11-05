"use client";

import { useEffect, useMemo, useState, type SubmitEvent } from "react";
import {
  Activity,
  Atom,
  Battery,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileText,
  MapPin,
  Radiation,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Video,
  X,
  Plus,
  Trash2,
} from "lucide-react";

import type {
  BatteryConfig,
  RadioUser,
  SimulationRange,
  UserScenarioConfig,
  UserScenarioIsotope,
} from "@/types/radioanalysis";

import { ISOTOPE_CATALOG } from "@/data/isotopeCatalog";
import ImpressionRichEditor from "@/components/admin/ImpressionRichEditor";

import type { UserImpression } from "@/types/radioanalysis";

type ScenarioType = "positive" | "negative";

type RangeKey = "cps" | "doseRate" | "temperature" | "pressure";

type SectionId = "radiation" | "device" | "isotopes" | "video" | "impression";

const sectionStyle =
  "overflow-hidden rounded-2xl border border-slate-800 bg-[#101f33]";

const inputStyle =
  "h-10 w-full min-w-0 rounded-lg border border-slate-700 bg-[#091525] px-3 text-sm text-white outline-none focus:border-blue-500";

const textareaStyle =
  "w-full rounded-lg border border-slate-700 bg-[#091525] px-3 py-3 text-sm text-white outline-none focus:border-blue-500";

const DEFAULTS = {
  positive: {
    cps: [108, 92, 124],
    doseRate: [0.84, 0.72, 0.96],
  },
  negative: {
    cps: [4, 1, 7],
    doseRate: [0.08, 0.04, 0.12],
  },
} as const;

function range(
  target: number,
  min: number,
  max: number,
  unit: string,
): SimulationRange {
  return { target, min, max, unit };
}

function createDefaults(
  userId: string,
  type: ScenarioType,
): UserScenarioConfig {
  const preset = DEFAULTS[type];

  return {
    id: "",
    userId,
    scenarioType: type,
    scenarioName:
      type === "positive"
        ? "Positive Radiation Simulation"
        : "Negative Radiation Simulation",
    enabled: true,
    scanDurationSeconds: 10,
    videoEnabled: type === "positive",
    videoUrl: "/assets/Timeline%201.mp4",
    cps: range(preset.cps[0], preset.cps[1], preset.cps[2], "CPS"),
    doseRate: range(
      preset.doseRate[0],
      preset.doseRate[1],
      preset.doseRate[2],
      "µSv/h",
    ),
    battery: {
      initialLevel: 86,
      drainMode: "normal",
      charging: false,
    },
    temperature: range(26.5, 25.5, 27.5, "°C"),
    pressure: range(1013, 1008, 1018, "hPa"),
    location: "Chennai, Tamil Nadu",
    isotopes: [],
    impression: [
      {
        title:
          type === "positive"
            ? "Radiation Activity Detected"
            : "No Significant Radiation Detected",
        description:
          type === "positive"
            ? "The simulated scan indicates elevated radiation activity"
            : "The simulated scan indicates no significant radiation anomaly",
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

function normalizeBattery(value: unknown): BatteryConfig {
  const input =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  const rawLevel =
    typeof input.initialLevel === "number"
      ? input.initialLevel
      : typeof input.target === "number"
        ? input.target
        : 86;

  return {
    initialLevel: Number.isFinite(rawLevel)
      ? Math.max(0, Math.min(100, Math.round(rawLevel)))
      : 86,
    drainMode:
      input.drainMode === "slow" || input.drainMode === "fast"
        ? input.drainMode
        : "normal",
    charging: input.charging === true,
  };
}

function normalizeImpressions(value: unknown): UserImpression[] {
  if (Array.isArray(value)) {
    return value.map((entry) => ({
      title: typeof entry?.title === "string" ? entry.title : "",
      description:
        typeof entry?.description === "string" ? entry.description : "",
    }));
  }

  if (value && typeof value === "object") {
    const old = value as Partial<UserImpression>;

    if (typeof old.title === "string" || typeof old.description === "string") {
      return [
        {
          title: old.title ?? "",
          description: old.description ?? "",
        },
      ];
    }
  }

  return [];
}

const isotopeCatalogById = new Map(
  ISOTOPE_CATALOG.map((entry) => [entry.id, entry]),
);

function enrichIsotopes(
  isotopes: UserScenarioIsotope[],
): UserScenarioIsotope[] {
  return isotopes.map((isotope) => {
    const catalogEntry = isotopeCatalogById.get(isotope.id);

    const energy = isotope.energy?.trim() || catalogEntry?.energy?.trim();

    return {
      ...isotope,
      ...(energy ? { energy } : {}),
    };
  });
}

function normalizeScenario(
  source: Partial<UserScenarioConfig>,
  userId: string,
): UserScenarioConfig {
  const type: ScenarioType =
    source.scenarioType === "negative" ? "negative" : "positive";

  const defaults = createDefaults(userId, type);

  return {
    ...defaults,
    ...source,
    userId,
    scenarioType: type,
    cps: source.cps ?? defaults.cps,
    doseRate: source.doseRate ?? defaults.doseRate,
    battery: normalizeBattery(source.battery),
    temperature: source.temperature ?? defaults.temperature,
    pressure: source.pressure ?? defaults.pressure,
    isotopes: Array.isArray(source.isotopes)
      ? enrichIsotopes(source.isotopes)
      : [],
    impression:
      source.impression == null
        ? defaults.impression
        : normalizeImpressions(source.impression),
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className="text-xs text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function RangeEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: SimulationRange;
  onChange: (next: SimulationRange) => void;
}) {
  const edit = (field: "target" | "min" | "max", text: string) =>
    onChange({
      ...value,
      [field]: Number(text),
    });

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0a1729] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="text-xs text-slate-400">{value.unit}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(["target", "min", "max"] as const).map((field) => (
          <Field
            key={field}
            label={
              field === "target"
                ? "Target"
                : field === "min"
                  ? "Minimum"
                  : "Maximum"
            }
          >
            <input
              type="number"
              step="any"
              required
              value={value[field]}
              onChange={(event) => edit(field, event.target.value)}
              className={inputStyle}
            />
          </Field>
        ))}
      </div>
    </div>
  );
}

function BatteryEditor({
  value,
  onChange,
}: {
  value: BatteryConfig;
  onChange: (value: BatteryConfig) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0a1729] p-4">
      <div className="mb-4 flex items-center gap-2">
        <Battery size={18} className="text-emerald-400" />
        <h3 className="text-sm font-semibold">Battery Configuration</h3>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Initial Battery (%)">
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            required
            className={inputStyle}
            value={value.initialLevel}
            onChange={(event) =>
              onChange({
                ...value,
                initialLevel: Number(event.target.value),
              })
            }
          />
        </Field>

        <Field label="Battery Consumption">
          <select
            className={inputStyle}
            value={value.drainMode}
            onChange={(event) =>
              onChange({
                ...value,
                drainMode: event.target.value as BatteryConfig["drainMode"],
              })
            }
          >
            <option value="slow">Power Saver — 1% / 10 min</option>
            <option value="normal">Normal — 1% / 5 min</option>
            <option value="fast">High Performance — 1% / 2 min</option>
          </select>
        </Field>
      </div>

      <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={value.charging}
          onChange={(event) =>
            onChange({
              ...value,
              charging: event.target.checked,
            })
          }
          className="h-4 w-4 accent-blue-500"
        />
        Device connected to charger
      </label>

      <p className="mt-3 text-xs text-slate-500">
        Battery decreases according to simulation runtime. Charging maintains
        the initial percentage.
      </p>
    </div>
  );
}

function Section({
  id,
  title,
  description,
  icon: Icon,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  description: string;
  icon: typeof Activity;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={sectionStyle}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`section-${id}`}
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-white/[0.02] sm:p-5"
      >
        <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-400">
          <Icon size={19} />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold sm:text-base">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>

        {expanded ? (
          <ChevronUp size={18} className="text-slate-400" />
        ) : (
          <ChevronDown size={18} className="text-slate-400" />
        )}
      </button>

      {expanded && (
        <div
          id={`section-${id}`}
          className="border-t border-slate-800 p-4 sm:p-5"
        >
          {children}
        </div>
      )}
    </section>
  );
}

export default function AdminScenariosPage() {
  const [users, setUsers] = useState<RadioUser[]>([]);
  const [scenarios, setScenarios] = useState<UserScenarioConfig[]>([]);

  const [selectedUserId, setSelectedUserId] = useState("");

  const [config, setConfig] = useState<UserScenarioConfig | null>(null);

  const [savedConfig, setSavedConfig] = useState<UserScenarioConfig | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [expanded, setExpanded] = useState<SectionId[]>([
    "radiation",
    "device",
  ]);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const [userResponse, scenarioResponse] = await Promise.all([
          fetch("/api/admin/users", {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/admin/scenarios", {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);

        const userPayload = await userResponse.json();
        const scenarioPayload = await scenarioResponse.json();

        if (!userResponse.ok || !scenarioResponse.ok) {
          throw new Error("Unable to load admin configuration");
        }

        const userList = Array.isArray(userPayload)
          ? userPayload
          : (userPayload.users ?? userPayload.data);

        const scenarioList = Array.isArray(scenarioPayload)
          ? scenarioPayload
          : (scenarioPayload.scenarios ?? scenarioPayload.data);

        if (!Array.isArray(userList) || !Array.isArray(scenarioList)) {
          throw new Error("Unexpected admin API response");
        }

        setUsers(userList);
        setScenarios(scenarioList);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(
            cause instanceof Error ? cause.message : "Unable to load scenarios",
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
  }, []);

  const activeUsers = useMemo(
    () => users.filter((user) => user.role === "user" && user.active),
    [users],
  );

  const selectedRecord = useMemo(
    () =>
      scenarios.find((scenario) => String(scenario.userId) === selectedUserId),
    [scenarios, selectedUserId],
  );

  const currentConfig = useMemo(
    () =>
      selectedUserId
        ? normalizeScenario(selectedRecord ?? {}, selectedUserId)
        : null,
    [selectedRecord, selectedUserId],
  );

  const displayedConfig = config ?? currentConfig;

  const chooseUser = (userId: string) => {
    setSelectedUserId(userId);
    setConfig(null);
    setSavedConfig(null);
    setSuccess("");
    setError("");
  };

  const editConfig = (
    updater: (previous: UserScenarioConfig) => UserScenarioConfig,
  ) => {
    if (!displayedConfig) return;
    setConfig(updater(displayedConfig));
    setSuccess("");
  };

  const changeType = (type: ScenarioType) => {
    editConfig((previous) => {
      if (previous.scenarioType === type) {
        return previous;
      }

      const defaults = createDefaults(previous.userId, type);

      return {
        ...previous,
        scenarioType: type,
        scenarioName: defaults.scenarioName,
        cps: defaults.cps,
        doseRate: defaults.doseRate,
        impression: defaults.impression,
        videoEnabled: type === "positive",
      };
    });
  };

  const updateRange = (field: RangeKey, value: SimulationRange) =>
    editConfig((previous) => ({
      ...previous,
      [field]: value,
    }));

  const toggleSection = (id: SectionId) => {
    setExpanded((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
    );
  };

  const [isotopeSearch, setIsotopeSearch] = useState("");

  const filteredIsotopes = useMemo(() => {
    const query = isotopeSearch.trim().toLowerCase();

    if (!query) return ISOTOPE_CATALOG;

    return ISOTOPE_CATALOG.filter((isotope) =>
      `${isotope.name} ${isotope.symbol} ${isotope.description}`
        .toLowerCase()
        .includes(query),
    );
  }, [isotopeSearch]);

  const toggleIsotope = (id: string) => {
    const catalogEntry = ISOTOPE_CATALOG.find((item) => item.id === id);

    if (!catalogEntry) return;

    editConfig((previous) => {
      const alreadySelected = previous.isotopes.some((item) => item.id === id);

      if (alreadySelected) {
        return {
          ...previous,
          isotopes: previous.isotopes.filter((item) => item.id !== id),
        };
      }

      return {
        ...previous,
        isotopes: [
          ...previous.isotopes,
          {
            id: catalogEntry.id,
            name: catalogEntry.name,
            symbol: catalogEntry.symbol,
            energy: catalogEntry.energy,
            description: catalogEntry.description,
            status: catalogEntry.naturallyStable ? "stable" : "unstable",
          },
        ],
      };
    });
  };

  const changeIsotopeStatus = (
    id: string,
    status: UserScenarioIsotope["status"],
  ) => {
    editConfig((previous) => ({
      ...previous,
      isotopes: previous.isotopes.map((item) =>
        item.id === id ? { ...item, status } : item,
      ),
    }));
  };

  const addImpression = () => {
    editConfig((previous) => ({
      ...previous,
      impression: [...previous.impression, { title: "", description: "" }],
    }));
  };

  const updateImpression = (
    index: number,
    field: "title" | "description",
    value: string,
  ) => {
    editConfig((previous) => ({
      ...previous,
      impression: previous.impression.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const removeImpression = (index: number) => {
    editConfig((previous) => ({
      ...previous,
      impression: previous.impression.filter(
        (_, currentIndex) => currentIndex !== index,
      ),
    }));
  };

  const moveImpression = (index: number, direction: -1 | 1) => {
    editConfig((previous) => {
      const items = [...previous.impression];
      const target = index + direction;

      if (target < 0 || target >= items.length) {
        return previous;
      }

      [items[index], items[target]] = [items[target], items[index]];

      return {
        ...previous,
        impression: items,
      };
    });
  };

  const handleSave = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!displayedConfig || !selectedUserId) return;

    const fields: RangeKey[] = ["cps", "doseRate"];

    for (const field of fields) {
      const item = displayedConfig[field];

      if (
        !Number.isFinite(item.min) ||
        !Number.isFinite(item.max) ||
        !Number.isFinite(item.target) ||
        item.min > item.target ||
        item.target > item.max
      ) {
        setError(
          `Invalid ${field} range. Minimum ≤ Target ≤ Maximum is required.`,
        );
        return;
      }
    }

    const battery = displayedConfig.battery;
    if (
      !Number.isInteger(battery.initialLevel) ||
      battery.initialLevel < 0 ||
      battery.initialLevel > 100 ||
      !["slow", "normal", "fast"].includes(battery.drainMode)
    ) {
      setError("Invalid battery configuration");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const {
        id: _id,
        userId: _userId,
        updatedAt: _updatedAt,
        ...input
      } = displayedConfig;

      const scenarioInput = {
        ...input,
        isotopes: enrichIsotopes(input.isotopes),
      };

      const response = await fetch(
        `/api/admin/scenarios/${encodeURIComponent(selectedUserId)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(scenarioInput),
        },
      );

      const contentType = response.headers.get("content-type") ?? "";

      const payload = contentType.includes("application/json")
        ? await response.json().catch(() => null)
        : null;
      if (!response.ok) {
        throw new Error(
          payload?.message ??
            `Unable to save scenario (${response.status} ${response.statusText})`,
        );
      }

      if (!payload || payload.success === false) {
        throw new Error(
          payload?.message ??
            "The server did not confirm that the scenario was saved.",
        );
      }

      const savedData = payload.data ?? payload;

      if (
        !savedData ||
        typeof savedData !== "object" ||
        !savedData.scenarioType ||
        !Array.isArray(savedData.isotopes)
      ) {
        throw new Error("The server returned an invalid saved scenario.");
      }

      const saved = normalizeScenario(savedData, selectedUserId);

      setScenarios((previous) => [
        ...previous.filter((item) => String(item.userId) !== selectedUserId),
        saved,
      ]);

      setConfig(null);
      setSavedConfig(saved);
      setSuccess("Scenario configuration saved.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save scenario",
      );
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setConfig(savedConfig);
    setError("");
    setSuccess("");
  };

  const selectedUser = activeUsers.find((user) => user.id === selectedUserId);

  const formConfig = config ?? savedConfig ?? currentConfig;

  const isOpen = (id: SectionId) => expanded.includes(id);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-28 animate-pulse rounded-2xl bg-slate-800/60"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">
          Scenario Configuration
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Configure radiation simulations for individual users.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-sm text-emerald-300"
        >
          {success}
        </p>
      )}

      {/* User selector */}
      <section className={`${sectionStyle} p-5`}>
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <Field label="Assign configuration to user">
            <select
              value={selectedUserId}
              onChange={(event) => chooseUser(event.target.value)}
              className={inputStyle}
            >
              <option value="">Select a user</option>
              {activeUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.username} ({user.username})
                </option>
              ))}
            </select>
          </Field>

          {selectedUser && (
            <p className="rounded-lg bg-slate-800 px-4 py-3 text-xs text-slate-300">
              {selectedUser.username}
            </p>
          )}
        </div>
      </section>

      {!formConfig ? (
        <div className={`${sectionStyle} p-12 text-center`}>
          <Settings2 className="mx-auto mb-3 text-slate-500" size={32} />
          <p className="text-slate-300">
            Select a user to configure their scenario.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          {/* Scenario selector */}
          <section className={`${sectionStyle} p-5`}>
            <h2 className="mb-4 font-semibold">Scenario Type</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              {(["positive", "negative"] as const).map((type) => {
                const active = formConfig.scenarioType === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => changeType(type)}
                    aria-pressed={active}
                    className={`rounded-xl border p-4 text-left transition ${
                      active
                        ? type === "positive"
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-purple-500 bg-purple-500/10"
                        : "border-slate-700 bg-slate-950/40 hover:border-slate-500"
                    }`}
                  >
                    {type === "positive" ? (
                      <Radiation size={23} className="mb-3 text-amber-400" />
                    ) : (
                      <ShieldCheck size={23} className="mb-3 text-purple-400" />
                    )}
                    <p className="font-semibold capitalize">{type}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {type === "positive"
                        ? "Elevated radiation activity"
                        : "No significant radiation activity"}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Scenario Name">
                <input
                  required
                  className={inputStyle}
                  value={formConfig.scenarioName}
                  onChange={(event) =>
                    editConfig((previous) => ({
                      ...previous,
                      scenarioName: event.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Initialization Duration (seconds)">
                <input
                  required
                  min={1}
                  type="number"
                  className={inputStyle}
                  value={formConfig.scanDurationSeconds}
                  onChange={(event) =>
                    editConfig((previous) => ({
                      ...previous,
                      scanDurationSeconds: Number(event.target.value),
                    }))
                  }
                />
              </Field>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <input
                id="scenario-enabled"
                type="checkbox"
                checked={formConfig.enabled}
                onChange={(event) =>
                  editConfig((previous) => ({
                    ...previous,
                    enabled: event.target.checked,
                  }))
                }
                className="h-4 w-4 accent-blue-500"
              />
              <label
                htmlFor="scenario-enabled"
                className="text-sm text-slate-300"
              >
                Enable assigned scenario
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <span className="rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-300">
                <Clock3 size={13} className="mr-1 inline" />
                Identifier:{" "}
                {formConfig.scenarioType === "positive"
                  ? "30 seconds"
                  : "300 seconds"}
              </span>
              <span className="rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-300">
                Rings: {formConfig.scenarioType === "positive" ? "12" : "0"}
              </span>
            </div>
          </section>

          {/* Radiation */}
          <Section
            id="radiation"
            title="Radiation Values"
            description="Count rate and dose rate simulation ranges"
            icon={Activity}
            expanded={isOpen("radiation")}
            onToggle={() => toggleSection("radiation")}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <RangeEditor
                label="Count Rate"
                value={formConfig.cps}
                onChange={(value) => updateRange("cps", value)}
              />
              <RangeEditor
                label="Dose Rate"
                value={formConfig.doseRate}
                onChange={(value) => updateRange("doseRate", value)}
              />
            </div>
          </Section>

          {/* Device */}
          <Section
            id="device"
            title="Device Configuration"
            description="Location and configured environmental readings"
            icon={Battery}
            expanded={isOpen("device")}
            onToggle={() => toggleSection("device")}
          >
            <div className="space-y-4">
              <Field label="Configured Location">
                <div className="relative">
                  <MapPin
                    size={17}
                    className="absolute left-3 top-3 text-slate-500"
                  />
                  <input
                    required
                    className={`${inputStyle} pl-10`}
                    value={formConfig.location}
                    onChange={(event) =>
                      editConfig((previous) => ({
                        ...previous,
                        location: event.target.value,
                      }))
                    }
                    placeholder="Coimbatore, Tamil Nadu"
                  />
                </div>
              </Field>

              <BatteryEditor
                value={formConfig.battery}
                onChange={(battery) =>
                  editConfig((previous) => ({
                    ...previous,
                    battery,
                  }))
                }
              />
            </div>
          </Section>

          {/* Isotopes */}

          <Section
            id="isotopes"
            title="Radioisotope Configuration"
            description="Select isotopes and configure their scenario status"
            icon={Atom}
            expanded={isOpen("isotopes")}
            onToggle={() => toggleSection("isotopes")}
          >
            <div className="space-y-4">
              {/* Header and Search */}
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Isotope Library
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Select the isotopes required for this scenario.
                  </p>
                </div>

                <span className="w-fit rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400">
                  {formConfig.isotopes.length} Selected
                </span>
              </div>

              <input
                type="search"
                placeholder="Search by isotope name or symbol..."
                value={isotopeSearch}
                onChange={(event) => setIsotopeSearch(event.target.value)}
                className={inputStyle}
              />

              {/* Isotope Catalog */}
              <div className="max-h-[420px] overflow-y-auto rounded-xl border border-slate-800 bg-[#0a1729]">
                {filteredIsotopes.map((isotope) => {
                  const selected = formConfig.isotopes.find(
                    (item) => item.id === isotope.id,
                  );

                  return (
                    <div
                      key={isotope.id}
                      className={`border-b border-slate-800/70 px-4 py-3 last:border-b-0 ${
                        selected ? "bg-blue-500/[0.04]" : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          id={`isotope-${isotope.id}`}
                          type="checkbox"
                          checked={Boolean(selected)}
                          onChange={() => toggleIsotope(isotope.id)}
                          className="h-4 w-4 shrink-0 accent-blue-500"
                        />

                        <label
                          htmlFor={`isotope-${isotope.id}`}
                          className="min-w-0 flex-1 cursor-pointer"
                        >
                          <span className="block text-sm font-medium text-slate-100">
                            {isotope.name}
                            <span className="ml-2 text-xs text-cyan-400">
                              {isotope.symbol}
                            </span>
                          </span>

                          <span className="mt-0.5 block text-xs text-slate-500">
                            {isotope.energy}
                          </span>

                          <span className="mt-0.5 block text-xs text-slate-500">
                            {isotope.description}
                          </span>
                        </label>

                        <span
                          className={`rounded-md px-2 py-1 text-[10px] font-medium ${
                            isotope.naturallyStable
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-amber-500/10 text-amber-400"
                          }`}
                        >
                          {isotope.naturallyStable
                            ? "Stable nuclide"
                            : "Radioactive nuclide"}
                        </span>

                        {selected && (
                          <select
                            aria-label={`Scenario status for ${isotope.name}`}
                            value={selected.status}
                            onChange={(event) =>
                              changeIsotopeStatus(
                                isotope.id,
                                event.target
                                  .value as UserScenarioIsotope["status"],
                              )
                            }
                            className="h-9 w-32 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-white outline-none focus:border-blue-500"
                          >
                            <option value="stable">Stable</option>
                            <option value="unstable">Unstable</option>
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredIsotopes.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No isotopes match your search.
                  </div>
                )}
              </div>

              {/* Selected Summary */}
              {formConfig.isotopes.length > 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Selected Isotopes
                  </h4>

                  <div className="flex flex-wrap gap-2">
                    {formConfig.isotopes.map((isotope) => (
                      <div
                        key={isotope.id}
                        className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2"
                      >
                        <span className="text-xs text-white">
                          {isotope.symbol || isotope.name}
                        </span>

                        <span className="text-xs font-medium text-cyan-400">
                          {isotope.energy}
                        </span>

                        <span
                          className={
                            isotope.status === "stable"
                              ? "text-[10px] text-emerald-400"
                              : "text-[10px] text-amber-400"
                          }
                        >
                          {isotope.status}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            editConfig((previous) => ({
                              ...previous,
                              isotopes: previous.isotopes.filter(
                                (item) => item.id !== isotope.id,
                              ),
                            }))
                          }
                          aria-label={`Remove ${isotope.name}`}
                          className="text-slate-500 hover:text-red-400"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500">
                Catalog labels describe physical isotope stability. The selected
                status is an admin-defined simulation classification and does
                not change nuclear properties.
              </p>
            </div>
          </Section>

          {/* Video */}
          <Section
            id="video"
            title="Video Playback"
            description="Configure post-identification video"
            icon={Video}
            expanded={isOpen("video")}
            onToggle={() => toggleSection("video")}
          >
            {formConfig.scenarioType === "negative" ? (
              <p className="text-sm text-slate-400">
                Negative scenarios skip video and proceed directly to the live
                scanner.
              </p>
            ) : (
              <div className="space-y-4">
                <label className="flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={formConfig.videoEnabled}
                    onChange={(event) =>
                      editConfig((previous) => ({
                        ...previous,
                        videoEnabled: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-blue-500"
                  />
                  Enable scan video
                </label>

                {formConfig.videoEnabled && (
                  <Field label="Video URL">
                    <input
                      required
                      className={inputStyle}
                      value={formConfig.videoUrl}
                      onChange={(event) =>
                        editConfig((previous) => ({
                          ...previous,
                          videoUrl: event.target.value,
                        }))
                      }
                    />
                  </Field>
                )}
              </div>
            )}
          </Section>

          {/* Impression */}

          <Section
            id="impression"
            title="Impression Summary"
            description="Configure multiple findings for the user dashboard"
            icon={FileText}
            expanded={isOpen("impression")}
            onToggle={() => toggleSection("impression")}
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Impression Entries
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Add findings and descriptions in display order.
                  </p>
                </div>

                <span className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400">
                  {formConfig.impression.length} Entries
                </span>
              </div>

              {formConfig.impression.map((item, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-800 bg-[#0a1729] p-4"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-200">
                      Impression {index + 1}
                    </h4>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveImpression(index, -1)}
                        aria-label={`Move impression ${index + 1} up`}
                        className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white disabled:opacity-30"
                      >
                        <ChevronUp size={16} />
                      </button>

                      <button
                        type="button"
                        disabled={index === formConfig.impression.length - 1}
                        onClick={() => moveImpression(index, 1)}
                        aria-label={`Move impression ${index + 1} down`}
                        className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white disabled:opacity-30"
                      >
                        <ChevronDown size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeImpression(index)}
                        aria-label={`Remove impression ${index + 1}`}
                        className="rounded-lg border border-red-900/40 p-2 text-red-400 hover:bg-red-950/30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <span className="text-xs text-slate-400">
                        Impression Title
                      </span>
                      <ImpressionRichEditor
                        value={item.title}
                        onChange={(value) =>
                          updateImpression(index, "title", value)
                        }
                        maxLength={150}
                        singleLine
                        placeholder="Enter finding title"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-xs text-slate-400">
                        Description
                      </span>
                      <ImpressionRichEditor
                        value={item.description}
                        onChange={(value) =>
                          updateImpression(index, "description", value)
                        }
                        maxLength={3000}
                        placeholder="Describe the finding..."
                      />
                    </div>
                  </div>
                </div>
              ))}

              {formConfig.impression.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">
                  No impressions added. Add an entry to begin.
                </p>
              )}

              <button
                type="button"
                onClick={addImpression}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-500/40 bg-blue-500/5 px-4 py-3 text-sm font-medium text-blue-400 transition hover:bg-blue-500/10"
              >
                <Plus size={17} />
                Add Impression
              </button>
            </div>
          </Section>

          {/* Save bar */}
          <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 bg-[#14243a]/95 p-4 shadow-xl backdrop-blur">
            <p className="text-xs text-slate-400">
              Configuration for{" "}
              <strong className="text-slate-200">
                {selectedUser?.name || selectedUser?.username}
              </strong>
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={reset}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2.5 text-sm hover:bg-slate-800"
              >
                <RotateCcw size={15} />
                Reset
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
