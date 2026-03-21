import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAiChatStore } from "@/stores/aiChat";

export function ConfigurationView() {
  const [profileInput, setProfileInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const {
    authChecked,
    isAuthenticated,
    awsProfile,
    error,
    login,
    setAwsProfile,
    clearAwsProfile,
  } = useAiChatStore();

  const handleConnect = async () => {
    if (!profileInput.trim() || isConnecting) return;
    setIsConnecting(true);
    try {
      await setAwsProfile(profileInput.trim());
      if (!useAiChatStore.getState().isAuthenticated) {
        await login();
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="w-96 flex flex-col h-full border-l border-(--color-border-default) bg-(--color-bg-base)">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-(--color-border-default) flex-shrink-0">
        <span className="text-[length:var(--font-size-ui-md)] font-medium text-(--color-text-primary)">
          AI settings
        </span>
      </div>

      {/* Content */}
      <div className="flex flex-col items-center justify-center flex-1 px-4 gap-4">
        {!authChecked && (
          <Loader2 className="w-6 h-6 text-(--color-text-tertiary) animate-spin" />
        )}

        {authChecked && !isAuthenticated && !awsProfile && (
          <>
            <p className="text-[length:var(--font-size-ui-md)] font-medium text-(--color-text-primary)">
              Connect to AWS Bedrock
            </p>
            <input
              type="text"
              value={profileInput}
              onChange={(e) => setProfileInput(e.target.value)}
              placeholder="e.g., ai-prod-llm"
              data-ui-input
              className="w-full px-3 py-1.5 text-[length:var(--font-size-ui-base)] border border-(--color-border-default) rounded-(--radius-base) bg-(--color-bg-subtle) text-(--color-text-primary) focus:outline-none focus:border-(--color-accent) focus:shadow-[0_0_0_2px_color-mix(in_oklch,var(--color-accent)_25%,transparent)]"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConnect();
              }}
            />
            <button
              onClick={handleConnect}
              disabled={!profileInput.trim() || isConnecting}
              className="w-full px-4 py-2 text-[length:var(--font-size-ui-base)] font-medium text-(--color-text-on-accent) bg-(--color-accent) hover:bg-(--color-accent-hover) rounded-(--radius-base) disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? "Connecting…" : "Connect"}
            </button>
          </>
        )}

        {authChecked && !isAuthenticated && awsProfile && (
          <>
            <p className="text-[length:var(--font-size-ui-md)] font-medium text-(--color-text-primary)">
              Session expired
            </p>
            <button
              onClick={login}
              className="w-full px-4 py-2 text-[length:var(--font-size-ui-base)] font-medium text-(--color-text-on-accent) bg-(--color-accent) hover:bg-(--color-accent-hover) rounded-(--radius-base)"
            >
              Re-authenticate
            </button>
            <button
              onClick={clearAwsProfile}
              className="text-[length:var(--font-size-ui-sm)] text-(--color-accent) hover:underline"
            >
              Change profile
            </button>
          </>
        )}

        {error && (
          <p className="text-[length:var(--font-size-ui-base)] text-(--color-state-danger)">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
