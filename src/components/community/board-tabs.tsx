"use client";

import { cn } from "@/lib/utils";

type BoardTabsProps = {
  activeTab: string;
  onChange: (tab: string) => void;
};

const TABS = [
  { value: "", label: "전체" },
  { value: "FREE", label: "자유" },
  { value: "QNA", label: "Q&A" },
  { value: "TIPS", label: "제작 팁" },
  { value: "SHOWCASE", label: "작품 자랑" },
  { value: "RECRUITMENT", label: "협업 모집" },
  { value: "NOTICE", label: "공지" },
];

export function BoardTabs({ activeTab, onChange }: BoardTabsProps) {
  return (
    <div className="flex overflow-x-auto snap-x scrollbar-hide gap-2 pb-2 border-b border-border">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "snap-start whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors relative",
            activeTab === tab.value
              ? "text-violet-600 dark:text-violet-400"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
          {activeTab === tab.value && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-600 dark:bg-violet-400 rounded-t-full" />
          )}
        </button>
      ))}
    </div>
  );
}
