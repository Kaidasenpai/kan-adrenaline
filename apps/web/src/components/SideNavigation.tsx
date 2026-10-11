import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useEffect, useMemo, useState } from "react";
import { HiBolt } from "react-icons/hi2";
import {
  TbLayoutKanban,
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarLeftExpand,
  TbSettings,
  TbTemplate,
  TbUsers,
} from "react-icons/tb";
import { twMerge } from "tailwind-merge";

import type { Subscription } from "@kan/shared/utils";
import { hasActiveSubscription } from "@kan/shared/utils";

import type { KeyboardShortcut } from "~/providers/keyboard-shortcuts";
import { BrandLogo } from "~/components/BrandLogo";
import ButtonComponent from "~/components/Button";
import ReactiveButton from "~/components/ReactiveButton";
import UserMenu from "~/components/UserMenu";
import WorkspaceMenu from "~/components/WorkspaceMenu";
import { useLocalisation } from "~/hooks/useLocalisation";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

interface SideNavigationProps {
  user: UserType;
  isLoading: boolean;
  onCloseSideNav?: () => void;
}

interface UserType {
  displayName?: string | null | undefined;
  email?: string | null | undefined;
  image?: string | null | undefined;
}

export default function SideNavigation({
  user,
  isLoading,
  onCloseSideNav,
}: SideNavigationProps) {
  const { locale } = useLocalisation();
  const router = useRouter();
  const { workspace } = useWorkspace();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isInitialised, setIsInitialised] = useState(false);

  const { data: workspaceData } = api.workspace.byId.useQuery(
    { workspacePublicId: workspace.publicId },
    { enabled: !!workspace.publicId && workspace.publicId.length >= 12 },
  );

  const subscriptions = workspaceData?.subscriptions as
    | Subscription[]
    | undefined;

  useEffect(() => {
    const savedState = localStorage.getItem("kan_sidebar-collapsed");
    if (savedState !== null) {
      setIsCollapsed(Boolean(JSON.parse(savedState)));
    }
    setIsInitialised(true);
  }, []);

  useEffect(() => {
    if (isInitialised) {
      localStorage.setItem(
        "kan_sidebar-collapsed",
        JSON.stringify(isCollapsed),
      );
    }
  }, [isCollapsed, isInitialised]);

  const { pathname } = router;

  const isCloudEnv = env("NEXT_PUBLIC_KAN_ENV") === "cloud";

  const navigation: {
    name: string;
    href: string;
    icon: React.ReactNode;
    keyboardShortcut: KeyboardShortcut;
  }[] = useMemo(
    () => [
      {
        name: t`Boards`,
        href: "/boards",
        icon: <TbLayoutKanban size={20} aria-hidden="true" />,
        keyboardShortcut: {
          type: "SEQUENCE",
          strokes: [{ key: "G" }, { key: "B" }],
          action: () => router.push("/boards"),
          group: "NAVIGATION",
          description: t`Go to boards`,
        },
      },
      {
        name: t`Templates`,
        href: "/templates",
        icon: <TbTemplate size={20} aria-hidden="true" />,
        keyboardShortcut: {
          type: "SEQUENCE",
          strokes: [{ key: "G" }, { key: "T" }],
          action: () => router.push("/templates"),
          group: "NAVIGATION",
          description: t`Go to templates`,
        },
      },
      {
        name: t`Members`,
        href: "/members",
        icon: <TbUsers size={20} aria-hidden="true" />,
        keyboardShortcut: {
          type: "SEQUENCE",
          strokes: [{ key: "G" }, { key: "M" }],
          action: () => router.push("/members"),
          group: "NAVIGATION",
          description: t`Go to members`,
        },
      },
      {
        name: t`Settings`,
        href: "/settings",
        icon: <TbSettings size={20} aria-hidden="true" />,
        keyboardShortcut: {
          type: "SEQUENCE",
          strokes: [{ key: "G" }, { key: "S" }],
          action: () => router.push("/settings"),
          group: "NAVIGATION",
          description: t`Go to settings`,
        },
      },
    ],
    // Lingui macros read the active locale indirectly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, locale],
  );

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      <nav
        className={twMerge(
          "flex h-full w-[244px] flex-col justify-between border-e border-light-400 bg-light-100 px-4 pb-5 pt-7 dark:border-dark-400 dark:bg-dark-100",
          isCollapsed && "md:w-[72px] md:px-3",
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto pb-6">
          <div
            className={twMerge(
              "mb-8 flex items-center justify-between gap-1 md:flex",
              isCollapsed && "md:flex-col",
            )}
          >
            <Link
              href="/boards"
              onClick={onCloseSideNav}
              className="focus-visible:outline-brand-accent dark:focus-visible:outline-brand-lime rounded ps-1 focus-visible:outline focus-visible:outline-2"
            >
              <BrandLogo size="sm" compact={isCollapsed} />
            </Link>
            <Button
              onClick={toggleCollapse}
              aria-label={isCollapsed ? t`Expand sidebar` : t`Collapse sidebar`}
              className={twMerge(
                "focus-visible:outline-brand-accent dark:focus-visible:outline-brand-lime hidden h-8 items-center justify-center rounded-md hover:bg-light-200 focus-visible:outline focus-visible:outline-2 dark:hover:bg-dark-200 md:flex",
                isCollapsed ? "w-full" : "w-8",
              )}
            >
              {isCollapsed ? (
                <TbLayoutSidebarLeftExpand
                  size={18}
                  className="text-light-900 dark:text-dark-900 rtl:rotate-180"
                />
              ) : (
                <TbLayoutSidebarLeftCollapse
                  size={18}
                  className="text-light-900 dark:text-dark-900 rtl:rotate-180"
                />
              )}
            </Button>
          </div>
          <WorkspaceMenu isCollapsed={isCollapsed} />
          <ul role="list" className="mt-4 space-y-1">
            {navigation.map((item, index) => (
              <li key={item.name}>
                {index === 2 && (
                  <div
                    aria-hidden="true"
                    className="my-6 border-t border-light-400 dark:border-dark-400"
                  />
                )}
                <ReactiveButton
                  href={item.href}
                  current={pathname.includes(item.href)}
                  name={item.name}
                  icon={item.icon}
                  isCollapsed={isCollapsed}
                  onCloseSideNav={onCloseSideNav}
                  keyboardShortcut={item.keyboardShortcut}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="shrink-0 space-y-2 border-t border-light-400 pt-4 dark:border-dark-400">
          <UserMenu
            displayName={user.displayName ?? undefined}
            email={user.email ?? t`Email not provided`}
            imageUrl={user.image ?? undefined}
            isLoading={isLoading}
            isCollapsed={isCollapsed}
            onCloseSideNav={onCloseSideNav}
          />
          {isCloudEnv &&
            !hasActiveSubscription(subscriptions, "pro") &&
            !hasActiveSubscription(subscriptions, "team") && (
              <div className={twMerge(isCollapsed && "flex justify-center")}>
                {isCollapsed ? (
                  <ButtonComponent
                    iconLeft={<HiBolt />}
                    variant="secondary"
                    href={`/upgrade/select-plan?plan=team&workspacePublicId=${workspace.publicId}&returnUrl=${encodeURIComponent("/settings/billing")}`}
                    aria-label={t`Start free trial`}
                    title={t`Start free trial`}
                    iconOnly
                  />
                ) : (
                  <ButtonComponent
                    iconLeft={<HiBolt />}
                    fullWidth
                    variant="secondary"
                    href={`/upgrade/select-plan?plan=team&workspacePublicId=${workspace.publicId}&returnUrl=${encodeURIComponent("/settings/billing")}`}
                  >
                    {t`Start free trial`}
                  </ButtonComponent>
                )}
              </div>
            )}
        </div>
      </nav>
    </>
  );
}
