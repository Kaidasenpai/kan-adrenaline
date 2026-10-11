import { t } from "@lingui/core/macro";
import React, { forwardRef, useId, useState } from "react";
import ContentEditable from "react-contenteditable";
import { HiOutlineEye, HiOutlineEyeSlash } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  contentEditable?: boolean;
  prefix?: string;
  iconRight?: React.ReactNode;
  minHeight?: number;
  value?: string;
  errorMessage?: string;
  className?: string;
  onChange?: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  type?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      contentEditable,
      errorMessage,
      prefix,
      value,
      onChange,
      onKeyDown,
      iconRight,
      className,
      minHeight,
      type = "text",
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const errorId = useId();
    const describedBy = [
      props["aria-describedby"],
      errorMessage ? errorId : undefined,
    ]
      .filter(Boolean)
      .join(" ");
    const inputClasses =
      "block w-full rounded-lg border border-light-300 bg-white px-3.5 text-sm leading-5 text-light-1000 shadow-sm transition-[border-color,box-shadow] duration-150 ease-interface placeholder:text-light-900 hover:border-light-600 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/15 disabled:cursor-not-allowed disabled:bg-light-100 disabled:opacity-60 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-1000 dark:placeholder:text-dark-900 dark:hover:border-dark-600 dark:focus:border-brand-lime dark:focus:ring-brand-lime/20 dark:disabled:bg-dark-200";

    if (contentEditable) {
      return (
        <ContentEditable
          placeholder={props.placeholder}
          html={value ?? ""}
          onChange={onChange}
          onKeyDown={onKeyDown}
          disabled={props.disabled}
          style={{
            ...props.style,
            minHeight: minHeight ?? props.style?.minHeight,
          }}
          className={twMerge(
            inputClasses,
            "min-h-24 cursor-text overflow-y-auto py-3",
            className,
          )}
        />
      );
    }

    return (
      <div className="flex w-full min-w-0 flex-col gap-1.5">
        <div className="relative flex">
          {prefix && (
            <div className="flex shrink-0 items-center rounded-l-lg border border-r-0 border-light-300 bg-light-100 px-3 text-sm text-light-950 dark:border-dark-400 dark:bg-dark-200 dark:text-dark-950">
              {prefix}
            </div>
          )}
          <input
            {...props}
            ref={ref}
            value={value}
            onChange={onChange}
            type={type === "password" && showPassword ? "text" : type}
            className={twMerge(
              inputClasses,
              "h-11 min-w-0 py-2.5",
              prefix && "rounded-l-none",
              (type === "password" || iconRight) && "pr-12",
              errorMessage &&
                "border-red-500 focus:border-red-600 focus:ring-red-500/15 dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-400/15",
              className,
            )}
            onKeyDown={onKeyDown}
            aria-invalid={errorMessage ? true : props["aria-invalid"]}
            aria-describedby={describedBy || undefined}
          />
          {type === "password" && (
            <button
              type="button"
              className="ease-interface focus-visible:ring-brand-accent dark:focus-visible:ring-brand-lime absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-light-900 transition-colors duration-150 hover:text-light-1000 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset dark:text-dark-900 dark:hover:text-dark-1000"
              aria-label={showPassword ? t`Hide password` : t`Show password`}
              aria-pressed={showPassword}
              disabled={props.disabled}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? (
                <HiOutlineEyeSlash className="h-5 w-5" aria-hidden="true" />
              ) : (
                <HiOutlineEye className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          )}
          {iconRight && type !== "password" && (
            <div
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 leading-[0]"
              aria-hidden="true"
            >
              {iconRight}
            </div>
          )}
        </div>
        {errorMessage && (
          <div id={errorId} className="text-xs text-red-600 dark:text-red-400">
            {errorMessage}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
