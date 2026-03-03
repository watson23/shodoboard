import type { ItemType } from "@/types/board";

interface TypeBadgeProps {
  type: ItemType;
  compact?: boolean;
}

export default function TypeBadge({ type, compact = false }: TypeBadgeProps) {
  if (compact) {
    return (
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          type === "discovery"
            ? "bg-purple-500 dark:bg-purple-400"
            : "bg-teal-500 dark:bg-teal-400"
        }`}
        title={type === "discovery" ? "Discovery" : "Delivery"}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
        type === "discovery"
          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
          : "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          type === "discovery"
            ? "bg-purple-500 dark:bg-purple-400"
            : "bg-teal-500 dark:bg-teal-400"
        }`}
      />
      {type === "discovery" ? "Discovery" : "Delivery"}
    </span>
  );
}
