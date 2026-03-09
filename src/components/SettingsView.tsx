import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAiChatStore } from "@/stores/aiChat";

const AWS_PROFILE_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

interface Preferences {
  aws_profile?: string | null;
  last_opened_folder?: string | null;
}

export function SettingsView() {
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

  const handleAwsProfileChange = (value: string) => {
    if (!prefsLoaded) return;
    setAwsProfile(value);
    if (!AWS_PROFILE_REGEX.test(value)) return;
    const merged = { ...fullPrefs, aws_profile: value };
    invoke("save_preferences", { preferences: merged }).catch(() => {});
    setStoreAwsProfile(value);
  };

  return (
    <div className="bg-white dark:bg-gray-800 h-full p-6">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          AI
        </p>
        <div>
          <label
            htmlFor="aws-profile"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            AWS Profile
          </label>
          <input
            id="aws-profile"
            ref={inputRef}
            type="text"
            value={awsProfile}
            onChange={(e) => handleAwsProfileChange(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus-visible:ring-2 ring-blue-500 outline-none"
            placeholder="e.g. default"
          />
        </div>
      </div>
    </div>
  );
}
