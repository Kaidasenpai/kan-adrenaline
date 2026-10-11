import Link from "next/link";
import { twMerge } from "tailwind-merge";

import LoadingSpinner from "./LoadingSpinner";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "xs" | "sm" | "md" | "lg";
  isLoading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  href?: string;
  fullWidth?: boolean;
  openInNewTab?: boolean;
  iconOnly?: boolean;
}

const Button = ({
  children,
  size = "md",
  iconLeft,
  iconRight,
  isLoading,
  variant = "primary",
  href,
  fullWidth,
  openInNewTab,
  iconOnly,
  className,
  disabled,
  ...props
}: ButtonProps) => {
  const isDisabled = Boolean(isLoading) || Boolean(disabled);
  const classes = twMerge(
    "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition-[background-color,color,border-color,box-shadow] duration-150 ease-interface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-light-50 dark:focus-visible:ring-brand-lime dark:focus-visible:ring-offset-dark-50",
    size === "xs" && "min-h-8 px-2.5 py-1 text-xs",
    size === "sm" && "min-h-10 px-3 py-2",
    size === "lg" && "min-h-12 px-5 py-3",
    fullWidth && "w-full",
    iconOnly && "p-0",
    iconOnly &&
      (size === "xs"
        ? "h-8 w-8"
        : size === "sm"
          ? "h-10 w-10"
          : size === "lg"
            ? "h-12 w-12"
            : "h-11 w-11"),
    variant === "primary" &&
      "bg-brand-lime text-brand-ink hover:bg-brand-hover active:bg-brand-muted",
    variant === "secondary" &&
      "border border-light-300 bg-white text-light-1000 hover:border-light-600 hover:bg-light-100 active:bg-light-200 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-1000 dark:hover:border-dark-600 dark:hover:bg-dark-200 dark:active:bg-dark-300",
    variant === "danger" &&
      "border border-red-700 bg-red-600 text-white hover:bg-red-700 active:bg-red-800 dark:border-red-500 dark:bg-red-600 dark:text-white dark:hover:bg-red-700",
    variant === "ghost" &&
      "bg-transparent text-light-950 shadow-none hover:bg-light-200 active:bg-light-300 dark:text-dark-950 dark:hover:bg-dark-200 dark:active:bg-dark-300",
    isDisabled && "pointer-events-none cursor-not-allowed opacity-50",
    className,
  );

  const content = (
    <span
      className={twMerge(
        "relative flex items-center justify-center",
        fullWidth && "w-full",
      )}
    >
      {isLoading && (
        <span className="absolute" aria-hidden="true">
          <LoadingSpinner size={size === "xs" ? "sm" : size} />
        </span>
      )}
      {iconOnly ? (
        <span
          className={twMerge(
            "flex items-center",
            isLoading ? "opacity-0" : "opacity-100",
          )}
        >
          {iconLeft ?? iconRight}
        </span>
      ) : (
        <span
          className={twMerge(
            fullWidth
              ? "grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-2"
              : "flex items-center",
            isLoading ? "opacity-0" : "opacity-100",
          )}
        >
          {fullWidth && !iconLeft && iconRight && (
            <span className="col-start-1 opacity-0">{iconRight}</span>
          )}
          {iconLeft && (
            <span
              className={twMerge(
                fullWidth ? "col-start-1 justify-self-start" : "mr-2",
              )}
            >
              {iconLeft}
            </span>
          )}
          <span
            className={twMerge(
              fullWidth ? "col-start-2 justify-self-center text-center" : "",
            )}
          >
            {children}
          </span>
          {iconRight && (
            <span
              className={twMerge(
                fullWidth ? "col-start-3 justify-self-end" : "ml-1",
              )}
            >
              {iconRight}
            </span>
          )}
          {fullWidth && !iconRight && iconLeft && (
            <span className="col-start-3 opacity-0">{iconLeft}</span>
          )}
        </span>
      )}
    </span>
  );

  if (href) {
    const linkProps = props as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <Link
        {...linkProps}
        href={href}
        className={classes}
        target={openInNewTab ? "_blank" : undefined}
        rel={openInNewTab ? "noopener noreferrer" : undefined}
        aria-disabled={isDisabled || undefined}
        aria-busy={isLoading ? true : undefined}
        tabIndex={isDisabled ? -1 : linkProps.tabIndex}
        onClick={
          isDisabled ? (event) => event.preventDefault() : linkProps.onClick
        }
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      {...props}
      className={classes}
      disabled={isDisabled}
      aria-busy={isLoading ? true : undefined}
    >
      {content}
    </button>
  );
};

export default Button;
