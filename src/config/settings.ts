import type { LucideIcon } from "lucide-react";
import { Keyboard, Sparkles } from "lucide-react";

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
        ],
      },
    ],
  },
  {
    id: "keyboard-shortcuts",
    label: "Keyboard shortcuts",
    icon: Keyboard,
    order: 2,
    sections: [],
  },
];

export function firstCategoryId(): string {
  return [...settingsConfig].sort((a, b) => a.order - b.order)[0].id;
}
