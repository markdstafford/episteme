import type { LucideIcon } from "lucide-react";
import { FileText, Sparkles, BookOpen } from "lucide-react";

export interface SettingItem {
  id: string;
  label: string;
  type: "text" | "select" | "toggle";
  order: number;
  defaultValue: string | boolean;
  options?: Array<{ value: string; label: string }>;
}

export interface SettingsSection {
  id: string;
  label: string;
  order: number;
  settings: SettingItem[];
}

export interface SettingsCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  order: number;
  sections: SettingsSection[];
}

export const settingsConfig: SettingsCategory[] = [
  {
    id: "ai",
    label: "AI",
    icon: Sparkles,
    order: 1,
    sections: [
      {
        id: "credentials",
        label: "Credentials",
        order: 1,
        settings: [
          {
            id: "aws_profile",
            label: "AWS Profile",
            type: "text",
            order: 1,
            defaultValue: "",
          },
          {
            id: "github_login",
            label: "GitHub Username",
            type: "text",
            order: 2,
            defaultValue: "",
          },
          {
            id: "ai_enhancement_enabled",
            label: "AI comment enhancement",
            type: "toggle",
            order: 10,
            defaultValue: true,
          },
          {
            id: "ai_enhancement_timeout_seconds",
            label: "Enhancement timeout (seconds)",
            type: "text",
            order: 11,
            defaultValue: "30",
          },
        ],
      },
    ],
  },
  {
    id: "reading",
    label: "Reading",
    icon: BookOpen,
    order: 2,
    sections: [
      {
        id: "preferences",
        label: "Preferences",
        order: 1,
        settings: [
          {
            id: "show_resolved_decorations",
            label: "Show resolved comment decorations",
            type: "toggle",
            order: 1,
            defaultValue: true,
          },
        ],
      },
    ],
  },
  {
    id: 'editor',
    label: 'Editor',
    icon: FileText,
    order: 2,
    sections: [
      {
        id: 'preview',
        label: 'Hover preview',
        order: 1,
        settings: [
          {
            id: 'preview_width',
            label: 'Preview width',
            type: 'text' as const,
            order: 1,
            defaultValue: '400px',
          },
          {
            id: 'preview_height',
            label: 'Preview height',
            type: 'text' as const,
            order: 2,
            defaultValue: '480px',
          },
        ],
      },
    ],
  },
];

export function firstCategoryId(): string {
  return [...settingsConfig].sort((a, b) => a.order - b.order)[0].id;
}
