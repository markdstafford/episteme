import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAiChatStore } from "@/stores/aiChat";
import { useSettingsStore } from "@/stores/settings";
import { settingsConfig } from "@/config/settings";
import { Input } from "@/components/ui/Input";
import { parsePreferences } from "@/lib/preferences";
import type { Preferences } from "@/lib/preferences";

const AWS_PROFILE_REGEX = /^[A-Za-z0-9_.-]{1,64}$/;

function AwsProfileSetting({ id, label }: { id: string; label: string }) {
  const [awsProfile, setAwsProfile] = useState("");
  const [fullPrefs, setFullPrefs] = useState<Preferences>(parsePreferences({}));
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const setStoreAwsProfile = useAiChatStore((s) => s.setAwsProfile);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    invoke<Preferences>("load_preferences")
      .then((prefs) => {
        setFullPrefs(prefs);
        setAwsProfile(prefs.aws_profile ?? "");
        setPrefsLoaded(true);
      })
      .catch(() => {});
  }, []);

  const handleChange = (value: string) => {
    if (!prefsLoaded) return;
    setAwsProfile(value);
    if (!AWS_PROFILE_REGEX.test(value)) return;
    const merged = { ...fullPrefs, aws_profile: value };
    invoke("save_preferences", { preferences: merged }).catch(() => {});
    setStoreAwsProfile(value);
  };

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      <label
        htmlFor={id}
        className="text-[length:var(--font-size-ui-base)] text-(--color-text-secondary)"
      >
        {label}
      </label>
      <Input
        id={id}
        ref={inputRef}
        value={awsProfile}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="e.g. default"
      />
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <h3 className="text-[length:var(--font-size-ui-md)] font-medium uppercase tracking-[0.06em] text-(--color-text-tertiary) mb-[var(--space-4)]">
      {label}
    </h3>
  );
}

const CSS_LENGTH_REGEX = /^\d+(\.\d+)?%$/;

function CssLengthSetting({ id, label }: { id: string; label: string }) {
  const [value, setValue] = useState("");
  const [fullPrefs, setFullPrefs] = useState<Preferences>(parsePreferences({}));
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    invoke<Preferences>("load_preferences")
      .then((prefs) => {
        setFullPrefs(prefs);
        setValue((prefs as Record<string, unknown>)[id] as string ?? "");
        setPrefsLoaded(true);
      })
      .catch(() => {});
  }, [id]);

  const handleChange = (raw: string) => {
    setValue(raw);
    const valid = CSS_LENGTH_REGEX.test(raw);
    setError(!valid);
    if (!prefsLoaded || !valid) return;
    const merged = { ...fullPrefs, [id]: raw };
    invoke("save_preferences", { preferences: merged }).catch(() => {});
  };

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      <label
        htmlFor={id}
        className="text-[length:var(--font-size-ui-base)] text-(--color-text-secondary)"
      >
        {label}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="e.g. 50%"
        aria-invalid={error}
      />
      {error && (
        <p className="text-[length:var(--font-size-ui-sm)] text-(--color-state-danger)">
          Enter a percentage value (e.g. 50%)
        </p>
      )}
    </div>
  );
}

const CSS_LENGTH_IDS = new Set(["preview_width", "preview_height"]);

function SettingControl({ settingId }: { settingId: string }) {
  const setting = settingsConfig
    .flatMap((c) => c.sections.flatMap((s) => s.settings))
    .find((s) => s.id === settingId);

  if (settingId === "aws_profile") {
    return <AwsProfileSetting id={settingId} label={setting?.label ?? settingId} />;
  }
  if (CSS_LENGTH_IDS.has(settingId)) {
    return <CssLengthSetting id={settingId} label={setting?.label ?? settingId} />;
  }
  if (import.meta.env.DEV) console.warn(`No control for setting: ${settingId}`);
  return null;
}

function CategoryContent({
  categoryId,
}: {
  categoryId: string;
}) {
  const category = settingsConfig.find((c) => c.id === categoryId);

  if (!category) {
    return (
      <p className="text-[length:var(--font-size-ui-base)] text-(--color-text-tertiary)">
        No settings yet.
      </p>
    );
  }

  const sortedSections = [...category.sections].sort((a, b) => a.order - b.order);

  return (
    <>
      {sortedSections.map((section) => (
        <div key={section.id} className="mb-[var(--space-6)]">
          <SectionHeader label={section.label} />
          <div className="flex flex-col gap-[var(--space-5)]">
            {[...section.settings]
              .sort((a, b) => a.order - b.order)
              .map((setting) => (
                <SettingControl key={setting.id} settingId={setting.id} />
              ))}
          </div>
        </div>
      ))}
    </>
  );
}

export function SettingsPanel() {
  const activeCategory = useSettingsStore((s) => s.activeCategory);

  return (
    <div className="flex-1 bg-(--color-bg-base) overflow-y-auto px-[var(--padding-content)] pt-[var(--space-6)]">
      <CategoryContent categoryId={activeCategory} />
    </div>
  );
}
