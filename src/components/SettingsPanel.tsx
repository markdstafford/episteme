import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAiChatStore } from "@/stores/aiChat";
import { useSettingsStore } from "@/stores/settings";
import { settingsConfig } from "@/config/settings";

const AWS_PROFILE_REGEX = /^[A-Za-z0-9_.-]{1,64}$/;

interface Preferences {
  aws_profile?: string | null;
  last_opened_folder?: string | null;
}

function AwsProfileSetting({ id, label }: { id: string; label: string }) {
  const [awsProfile, setAwsProfile] = useState("");
  const [fullPrefs, setFullPrefs] = useState<Preferences>({});
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

  useEffect(() => {
    inputRef.current?.focus();
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
      <input
        id={id}
        ref={inputRef}
        type="text"
        value={awsProfile}
        onChange={(e) => handleChange(e.target.value)}
        className="h-[var(--height-control-base)] px-[10px] text-[length:var(--font-size-ui-base)] bg-(--color-bg-subtle) border border-(--color-border-default) rounded-[var(--radius-base)] text-(--color-text-primary) placeholder:text-(--color-text-tertiary) focus:border-(--color-accent) focus:shadow-[0_0_0_2px_var(--color-accent-subtle)] outline-none transition-[border-color,box-shadow] duration-(--duration-fast)"
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

function SettingControl({ settingId }: { settingId: string }) {
  if (settingId === "aws_profile") {
    const setting = settingsConfig
      .flatMap((c) => c.sections.flatMap((s) => s.settings))
      .find((s) => s.id === settingId);
    return <AwsProfileSetting id={settingId} label={setting?.label ?? settingId} />;
  }
  if (import.meta.env.DEV) console.warn(`No control for setting: ${settingId}`);
  return null;
}

function CategoryContent({ categoryId }: { categoryId: string }) {
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
    <div className="flex-1 bg-(--color-bg-base) overflow-y-auto p-[var(--padding-content)]">
      <CategoryContent categoryId={activeCategory} />
    </div>
  );
}
