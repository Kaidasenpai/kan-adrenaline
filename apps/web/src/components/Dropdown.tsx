import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";

export default function Dropdown({
  items,
  children,
  disabled,
  ariaLabel,
  menuGap = "sm",
}: {
  items: {
    label: string;
    action?: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
  }[];
  children: React.ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
  menuGap?: "sm" | "md";
}) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button
          disabled={disabled}
          aria-label={ariaLabel}
          className="ease-interface focus-visible:ring-brand-accent dark:focus-visible:ring-brand-lime flex h-11 w-11 items-center justify-center rounded-lg text-light-900 transition-colors duration-150 data-[focus]:bg-light-200 hover:bg-light-200 hover:text-light-1000 focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 dark:text-dark-900 dark:data-[focus]:bg-dark-200 dark:hover:bg-dark-200 dark:hover:text-dark-1000"
        >
          {children}
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition-opacity ease-interface duration-150"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity ease-interface duration-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <Menu.Items
          anchor={{
            to: "bottom end",
            gap: menuGap === "sm" ? 4 : 8,
            padding: 12,
          }}
          className="isolate z-[100] max-h-[min(28rem,calc(100dvh-5rem))] w-60 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-lg border border-light-300 bg-white p-1.5 shadow-3xl-light focus:outline-none dark:border-dark-400 dark:bg-dark-100 dark:shadow-3xl-dark"
        >
          <div className="flex flex-col">
            {items.map((item) => (
              <Menu.Item key={item.label} disabled={item.disabled}>
                <button
                  onClick={item.action}
                  disabled={item.disabled ?? !item.action}
                  className="ease-interface flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-light-1000 transition-colors duration-150 data-[focus]:bg-light-100 hover:bg-light-100 focus:bg-light-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-dark-1000 dark:data-[focus]:bg-dark-200 dark:hover:bg-dark-200 dark:focus:bg-dark-200"
                >
                  {item.icon}
                  {item.label}
                </button>
              </Menu.Item>
            ))}
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
