import { Switch } from "@headlessui/react";
import { twMerge } from "tailwind-merge";

const Toggle = ({
  isChecked,
  onChange,
  label,
  disabled,
  showLabel = true,
  labelPosition = "before",
}: {
  isChecked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
  showLabel?: boolean;
  labelPosition?: "before" | "after";
}) => (
  <div className="flex min-h-11 items-center gap-3">
    {showLabel && labelPosition === "before" && (
      <span className="text-sm text-light-950 dark:text-dark-950">{label}</span>
    )}
    <Switch
      checked={isChecked}
      onChange={onChange}
      disabled={disabled}
      className={twMerge(
        "ease-interface focus-visible:ring-brand-accent dark:focus-visible:ring-brand-lime relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-light-700 transition-colors duration-150 after:absolute after:-inset-y-2 after:inset-x-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-light-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-dark-600 dark:focus-visible:ring-offset-dark-50",
        isChecked && "bg-brand-lime dark:bg-brand-lime",
      )}
    >
      <span className="sr-only">{label}</span>
      <span
        aria-hidden="true"
        className={twMerge(
          "ease-interface pointer-events-none inline-block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm ring-0 transition-[transform,background-color] duration-150",
          isChecked && "bg-brand-ink translate-x-[22px]",
        )}
      />
    </Switch>
    {showLabel && labelPosition === "after" && (
      <span className="text-sm text-light-950 dark:text-dark-950">{label}</span>
    )}
  </div>
);

export default Toggle;
