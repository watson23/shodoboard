import type { ItemType } from "@/types/board";

interface TypeBadgeProps {
  type: ItemType;
}

export default function TypeBadge({ type }: TypeBadgeProps) {
  return (
    <span className="inline-flex rounded overflow-hidden text-[10px] font-medium">
      <span
        className={`px-1.5 py-0.5 ${
          type === "discovery"
            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
            : "bg-purple-50 dark:bg-purple-900/10 text-purple-300 dark:text-purple-600"
        }`}
      >
        Dis
      </span>
      <span
        className={`px-1.5 py-0.5 ${
          type === "delivery"
            ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
            : "bg-teal-50 dark:bg-teal-900/10 text-teal-300 dark:text-teal-600"
        }`}
      >
        Del
      </span>
    </span>
  );
}
