import { useRouter } from "next/navigation";
import { Button, Menu, Transition } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { Fragment, useMemo, useState } from "react";
import { HiCheck, HiMagnifyingGlass } from "react-icons/hi2";
import { TbChevronDown } from "react-icons/tb";
import { twMerge } from "tailwind-merge";

import { useKeyboardShortcut } from "~/providers/keyboard-shortcuts";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { BrandMark } from "./BrandLogo";
import CommandPallette from "./CommandPallette";
import { Tooltip } from "./Tooltip";

export default function WorkspaceMenu({
  isCollapsed = false,
}: {
  isCollapsed?: boolean;
}) {
  const { workspace, isLoading, availableWorkspaces, switchWorkspace } =
    useWorkspace();
  const { openModal } = useModal();
  const { data: hasPartnerSlot } =
    api.workspace.hasAvailablePartnerSlot.useQuery();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const commandPaletteShortcut = useMemo(
    () => ({
      type: "PRESS" as const,
      stroke: {
        key: "k",
        modifiers: ["META"] as ("META" | "CONTROL" | "ALT" | "SHIFT")[],
      },
      action: () => setIsOpen(true),
      description: t`Open command menu`,
      group: "GENERAL" as const,
    }),
    [],
  );

  const { tooltipContent: commandPaletteShortcutTooltipContent } =
    useKeyboardShortcut(commandPaletteShortcut);

  return (
    <>
      <CommandPallette isOpen={isOpen} onClose={() => setIsOpen(false)} />
      <Menu as="div" className="relative inline-block w-full pb-3 text-left">
        <div>
          {isLoading ? (
            <div className={twMerge("mb-1 flex", isCollapsed && "md:p-1.5")}>
              <div className="h-6 w-6 animate-pulse rounded-md bg-light-200 dark:bg-dark-200" />
              <div
                className={twMerge(
                  "ml-2 h-6 w-[150px] animate-pulse rounded-md bg-light-200 dark:bg-dark-200",
                  isCollapsed && "md:hidden",
                )}
              />
            </div>
          ) : (
            <div
              className={twMerge(
                "flex flex-col items-stretch justify-start gap-2",
                isCollapsed && "md:items-center",
              )}
            >
              <Menu.Button
                className={twMerge(
                  "focus-visible:outline-brand-accent dark:focus-visible:outline-brand-lime flex min-h-14 w-full min-w-0 items-center justify-start rounded-md bg-light-200 px-2.5 py-2 hover:bg-light-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:bg-dark-200 dark:hover:bg-dark-300",
                  isCollapsed &&
                    "md:h-11 md:min-h-11 md:w-11 md:flex-none md:justify-center md:p-0",
                )}
                title={isCollapsed ? workspace.name : undefined}
              >
                <span className="bg-brand-ink inline-flex h-8 w-8 shrink-0 items-center justify-center rounded">
                  {workspace.name.toLowerCase().startsWith("adrenalin") ? (
                    <BrandMark className="h-6 w-7" />
                  ) : (
                    <span className="text-brand-lime text-xs font-bold leading-none">
                      {workspace.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <span
                  className={twMerge(
                    "ml-2.5 min-w-0 flex-1 text-left text-sm font-medium leading-5 text-neutral-900 dark:text-dark-1000",
                    isCollapsed && "md:hidden",
                  )}
                >
                  {workspace.name}
                </span>
                {workspace.plan === "pro" && (
                  <span
                    className={twMerge(
                      "ml-2 inline-flex items-center rounded-md bg-indigo-100 px-2 py-1 text-[10px] font-medium text-indigo-700",
                      isCollapsed && "md:hidden",
                    )}
                  >
                    Pro
                  </span>
                )}
                <TbChevronDown
                  aria-hidden="true"
                  className={twMerge(
                    "ml-1 h-4 w-4 shrink-0 text-light-900 dark:text-dark-900",
                    isCollapsed && "md:hidden",
                  )}
                />
              </Menu.Button>
              <Tooltip content={commandPaletteShortcutTooltipContent}>
                <Button
                  aria-label={t`Search`}
                  className={twMerge(
                    "focus-visible:outline-brand-accent dark:focus-visible:outline-brand-lime flex h-11 w-full items-center gap-2.5 rounded-md px-3 text-sm text-light-950 data-[focus]:bg-light-200 hover:bg-light-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-dark-950 dark:data-[focus]:bg-dark-200 dark:hover:bg-dark-200",
                    isCollapsed && "md:w-11 md:justify-center md:px-0",
                  )}
                  onClick={() => setIsOpen(true)}
                >
                  <HiMagnifyingGlass
                    className="h-[18px] w-[18px] shrink-0"
                    aria-hidden="true"
                  />
                  <span
                    className={twMerge(isCollapsed && "md:hidden")}
                  >{t`Search`}</span>
                  <span
                    aria-hidden="true"
                    className={twMerge(
                      "ml-auto text-xs text-light-900 dark:text-dark-900",
                      isCollapsed && "md:hidden",
                    )}
                  >
                    ⌘ K
                  </span>
                </Button>
              </Tooltip>
            </div>
          )}
        </div>

        <Transition
          as={Fragment}
          enter="transition duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition duration-100 ease-[cubic-bezier(0.22,1,0.36,1)]"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items
            data-sidebar-menu
            anchor={{ to: "bottom start", gap: 8, padding: 12 }}
            className={twMerge(
              "z-[100] max-h-[calc(100dvh-2rem)] origin-top-left overflow-y-auto rounded-md border border-light-600 bg-light-50 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-dark-600 dark:bg-dark-300",
              isCollapsed
                ? "w-60 max-w-[calc(100vw-1.5rem)]"
                : "w-[212px] max-w-[calc(100vw-1.5rem)]",
            )}
          >
            <div className="p-1">
              {availableWorkspaces.map((availableWorkspace) => (
                <div key={availableWorkspace.publicId} className="flex">
                  <Menu.Item>
                    <button
                      onClick={() => switchWorkspace(availableWorkspace)}
                      className="flex w-full items-center justify-between rounded-[5px] px-3 py-2 text-left text-sm text-neutral-900 data-[focus]:bg-light-200 hover:bg-light-200 dark:text-dark-1000 dark:data-[focus]:bg-dark-400 dark:hover:bg-dark-400"
                    >
                      <div className="flex min-w-0 flex-1 items-center">
                        <span className="bg-brand-ink inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded">
                          {availableWorkspace.name
                            .toLowerCase()
                            .startsWith("adrenalin") ? (
                            <BrandMark className="h-5 w-5" />
                          ) : (
                            <span className="text-brand-lime text-sm font-medium leading-none">
                              {availableWorkspace.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <span className="ml-2 truncate text-sm font-medium">
                          {availableWorkspace.name}
                        </span>
                      </div>
                      {workspace.publicId === availableWorkspace.publicId && (
                        <span>
                          <HiCheck className="h-4 w-4" aria-hidden="true" />
                        </span>
                      )}
                    </button>
                  </Menu.Item>
                </div>
              ))}
            </div>
            <div className="border-t-[1px] border-light-600 p-1 dark:border-dark-500">
              <Menu.Item>
                <button
                  onClick={() => {
                    if (env("NEXT_PUBLIC_KAN_ENV") !== "cloud") {
                      openModal("NEW_WORKSPACE");
                    } else if (hasPartnerSlot) {
                      router.push(
                        `/onboarding/workspace?partner=1&returnUrl=${encodeURIComponent(window.location.pathname)}`,
                      );
                    } else {
                      router.push(
                        `/onboarding/select-plan?returnUrl=${encodeURIComponent(window.location.pathname)}`,
                      );
                    }
                  }}
                  className="flex min-h-11 w-full items-center justify-between rounded-[5px] px-3 py-2 text-left text-sm text-neutral-900 data-[focus]:bg-light-200 hover:bg-light-200 dark:text-dark-1000 dark:data-[focus]:bg-dark-400 dark:hover:bg-dark-400"
                >
                  {t`Create workspace`}
                </button>
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </>
  );
}
