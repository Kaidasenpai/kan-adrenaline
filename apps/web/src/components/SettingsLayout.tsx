import Link from "next/link";
import { useRouter } from "next/router";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import {
  HiChevronDown,
  HiOutlineBanknotes,
  HiOutlineBolt,
  HiOutlineCodeBracketSquare,
  HiOutlineRectangleGroup,
  HiOutlineShieldCheck,
  HiOutlineUser,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { usePermissions } from "~/hooks/usePermissions";
import { useWorkspace } from "~/providers/workspace";

interface SettingsLayoutProps {
  children: React.ReactNode;
  currentTab: string;
}

export function SettingsLayout({ children, currentTab }: SettingsLayoutProps) {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const { canViewWorkspace, canEditWorkspace } = usePermissions();

  const isAdmin = workspace.role === "admin";

  const settingsTabs = [
    {
      key: "account",
      icon: <HiOutlineUser />,
      label: t`Account`,
      condition: true,
    },
    {
      key: "workspace",
      icon: <HiOutlineRectangleGroup />,
      label: t`Workspace`,
      condition: canViewWorkspace,
    },
    {
      key: "permissions",
      icon: <HiOutlineShieldCheck />,
      label: t`Permissions`,
      condition: isAdmin,
    },
    {
      key: "billing",
      label: t`Billing`,
      icon: <HiOutlineBanknotes />,
      condition: env("NEXT_PUBLIC_KAN_ENV") === "cloud" && isAdmin,
    },
    {
      key: "api",
      icon: <HiOutlineCodeBracketSquare />,
      label: t`API`,
      condition: true,
    },
    {
      key: "webhooks",
      icon: <HiOutlineBolt />,
      label: t`Webhooks`,
      condition: isAdmin,
    },
    {
      key: "integrations",
      icon: <HiOutlineCodeBracketSquare />,
      label: t`Integrations`,
      condition: canEditWorkspace,
    },
  ];

  const availableTabs = settingsTabs.filter((tab) => tab.condition);

  const selectedTabIndex = Math.max(
    0,
    availableTabs.findIndex((tab) => tab.key === currentTab),
  );

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto bg-light-50 dark:bg-dark-50">
      <div className="mx-auto w-full max-w-[1280px] px-5 pb-12 pt-7 sm:px-8 lg:px-10 lg:pt-10">
        <header className="mb-8 border-b border-light-300 pb-7 dark:border-dark-400">
          <p className="mb-2 text-xs font-medium text-light-900 dark:text-dark-900">
            {workspace.name}
          </p>
          <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.04em] text-light-1000 dark:text-dark-1000 sm:text-[34px]">
            {t`Settings`}
          </h1>
          <p className="mt-2 text-sm text-light-900 dark:text-dark-900">
            {t`Manage your account and workspace.`}
          </p>
        </header>

        <div className="min-w-0 md:flex md:items-start md:gap-8 lg:gap-10">
          <div className="mb-5 md:hidden">
            <Listbox
              value={selectedTabIndex}
              onChange={(index) => {
                const tabKey = availableTabs[index]?.key;
                if (tabKey) void router.push(`/settings/${tabKey}`);
              }}
            >
              <ListboxButton
                aria-label={t`Settings navigation`}
                className="ease-interface focus-visible:ring-brand-accent dark:focus-visible:ring-brand-lime relative flex h-11 w-full items-center gap-3 rounded-lg border border-light-300 bg-white px-3.5 pr-10 text-left text-sm font-medium text-light-1000 shadow-sm transition-colors duration-150 focus:outline-none focus-visible:ring-2 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-1000"
              >
                <span
                  aria-hidden="true"
                  className="[&>svg]:h-[18px] [&>svg]:w-[18px]"
                >
                  {availableTabs[selectedTabIndex]?.icon}
                </span>
                {availableTabs[selectedTabIndex]?.label ?? t`Choose a section`}
                <HiChevronDown
                  aria-hidden="true"
                  className="absolute right-3.5 h-4 w-4 text-light-900 dark:text-dark-900"
                />
              </ListboxButton>
              <ListboxOptions
                anchor={{ to: "bottom start", gap: 6, padding: 16 }}
                className="z-[100] max-h-[min(24rem,calc(100dvh-5rem))] w-[var(--button-width)] overflow-y-auto rounded-lg border border-light-300 bg-white p-1.5 text-sm shadow-3xl-light focus:outline-none dark:border-dark-400 dark:bg-dark-100 dark:shadow-3xl-dark"
              >
                {availableTabs.map((tab, index) => (
                  <ListboxOption
                    key={tab.key}
                    value={index}
                    className="data-[selected]:bg-brand-lime/15 data-[selected]:text-brand-accent dark:data-[selected]:bg-brand-lime/10 dark:data-[selected]:text-brand-lime flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-md px-3 py-2 text-light-1000 data-[focus]:bg-light-100 data-[selected]:font-semibold dark:text-dark-1000 dark:data-[focus]:bg-dark-200"
                  >
                    <span
                      aria-hidden="true"
                      className="[&>svg]:h-[18px] [&>svg]:w-[18px]"
                    >
                      {tab.icon}
                    </span>
                    {tab.label}
                  </ListboxOption>
                ))}
              </ListboxOptions>
            </Listbox>
          </div>

          <nav
            aria-label={t`Settings navigation`}
            className="sticky top-6 hidden w-[190px] shrink-0 space-y-1 md:block"
          >
            {availableTabs.map((tab) => (
              <Link
                key={tab.key}
                href={`/settings/${tab.key}`}
                aria-current={currentTab === tab.key ? "page" : undefined}
                className={twMerge(
                  "ease-interface focus-visible:ring-brand-accent dark:focus-visible:ring-brand-lime flex min-h-11 items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2",
                  currentTab === tab.key
                    ? "bg-brand-lime/15 text-brand-accent dark:bg-brand-lime/10 dark:text-brand-lime"
                    : "text-light-900 hover:bg-light-200 hover:text-light-1000 dark:text-dark-900 dark:hover:bg-dark-200 dark:hover:text-dark-1000",
                )}
              >
                <span
                  aria-hidden="true"
                  className="[&>svg]:h-[18px] [&>svg]:w-[18px]"
                >
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            ))}
          </nav>
          <div className="settings-content shadow-panel min-w-0 flex-1 rounded-lg border border-light-300 bg-white px-5 dark:border-dark-400 dark:bg-dark-100 sm:px-7">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
