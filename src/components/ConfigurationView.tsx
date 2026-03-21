import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAiChatStore } from "@/stores/aiChat";

export function ConfigurationView() {
  const [profileInput, setProfileInput] = useState("");

  const {
    authChecked,
    isAuthenticated,
    awsProfile,
    error,
    login,
    setAwsProfile,
  } = useAiChatStore();

  const handleConnect = async () => {
    if (!profileInput.trim()) return;
    await setAwsProfile(profileInput.trim());
    await login();
  };

  return (
    <div className="w-96 flex flex-col h-full border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Header */}
      <header
        role="banner"
        className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0"
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          AI settings
        </span>
      </header>

      {/* Content */}
      <div className="flex flex-col items-center justify-center flex-1 px-4 gap-4">
        {!authChecked && (
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        )}

        {authChecked && !isAuthenticated && !awsProfile && (
          <>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Connect to AWS Bedrock
            </p>
            <input
              type="text"
              value={profileInput}
              onChange={(e) => setProfileInput(e.target.value)}
              placeholder="e.g., ai-prod-llm"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConnect();
              }}
            />
            <button
              onClick={handleConnect}
              disabled={!profileInput.trim()}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect
            </button>
          </>
        )}

        {authChecked && !isAuthenticated && awsProfile && (
          <>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Session expired
            </p>
            <button
              onClick={login}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Re-authenticate
            </button>
            <button
              onClick={() =>
                useAiChatStore.setState({ awsProfile: null, authChecked: true })
              }
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Change profile
            </button>
          </>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
    </div>
  );
}
