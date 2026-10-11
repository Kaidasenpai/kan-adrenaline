import type { ReactNode } from "react";
import Link from "next/link";
import { twMerge } from "tailwind-merge";

import type { KeyboardShortcut } from "~/providers/keyboard-shortcuts";
import { useIsMobile } from "~/hooks/useMediaQuery";
import { useKeyboardShortcut } from "~/providers/keyboard-shortcuts";

export default function ReactiveButton({
  href,
  current,
  name,
  icon,
  isCollapsed = false,
  keyboardShortcut,
  onCloseSideNav,
}: {
  href: string;
  current: boolean;
  name: string;
  icon: ReactNode;
  isCollapsed?: boolean;
  onCloseSideNav?: () => void;
  keyboardShortcut: KeyboardShortcut;
}) {
  const isMobile = useIsMobile();
  const { keys } = useKeyboardShortcut(keyboardShortcut);
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      title={isCollapsed ? name : undefined}
      onClick={() => {
        if (isMobile) onCloseSideNav?.();
      }}
      className={twMerge(
        "focus-visible:ring-brand-accent dark:focus-visible:ring-brand-lime group relative flex h-11 items-center justify-between rounded-md px-3 text-sm font-medium text-light-950 outline-none transition-colors duration-150 focus-visible:ring-2 dark:text-dark-950",
        current
          ? "bg-brand-lime/15 dark:bg-brand-lime/10 text-light-1000 dark:text-dark-1000"
          : "hover:bg-light-200 hover:text-light-1000 dark:hover:bg-dark-200 dark:hover:text-dark-1000",
        isCollapsed && "md:justify-center md:px-0",
      )}
    >
      {current && (
        <span
          aria-hidden="true"
          className="bg-brand-accent dark:bg-brand-lime absolute -start-1 top-3 h-5 w-[3px] rounded-full"
        />
      )}
      <span
        className={twMerge(
          "flex items-center gap-3",
          isCollapsed && "md:gap-0",
        )}
      >
        {icon}
        <span className={twMerge(isCollapsed && "md:hidden")}>{name}</span>
      </span>
      {!isCollapsed && (
        <span
          dir="ltr"
          className="hidden text-xs text-light-950 group-hover:inline-flex group-focus-visible:inline-flex dark:text-dark-950"
        >
          {keys}
        </span>
      )}
    </Link>
  );
}
