import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X } from "lucide-react";
import { useAiChatStore } from "@/stores/aiChat";

const AWS_PROFILE_REGEX = /^[A-Za-z0-9_-]{1,64}$/;

interface SettingsDialogProps {
  onClose: () => void;
}

export function SettingsDialog({ onClose }: SettingsDialogProps) {
  const [awsProfile, setAwsProfile] = useState("");
  const setStoreAwsProfile = useAiChatStore((s) => s.setAwsProfile);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    invoke<{ aws_profile?: string | null }>("load_preferences")
      .then((prefs) => {
        setAwsProfile(prefs.aws_profile ?? "");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleAwsProfileChange = (value: string) => {
    setAwsProfile(value);
    if (!AWS_PROFILE_REGEX.test(value)) return;
    invoke("save_preferences", { preferences: { aws_profile: value } }).catch(() => {});
    setStoreAwsProfile(value);
  };

  return (
    <div
      data-testid="settings-backdrop"
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm w-96 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">AI</p>
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
              aria-label="AWS Profile"
              className="w-full border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus-visible:ring-2 ring-blue-500 outline-none"
              placeholder="e.g. default"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
