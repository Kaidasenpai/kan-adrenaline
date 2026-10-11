import Image from "next/image";
import { twMerge } from "tailwind-merge";

const sizes = {
  sm: {
    mark: "h-[30px] w-[38px]",
    word: "h-[31px] w-[118px]",
    descriptor: "text-[7px]",
  },
  md: {
    mark: "h-[36px] w-[46px]",
    word: "h-[35px] w-[134px]",
    descriptor: "text-[8px]",
  },
  lg: {
    mark: "h-[53px] w-[68px]",
    word: "h-[53px] w-[203px]",
    descriptor: "text-[10px]",
  },
};

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={twMerge(
        "bg-brand-lime inline-block h-8 w-10 shrink-0",
        className,
      )}
      style={{
        maskImage: "url(/branding/adrenaline-symbol.png)",
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
      }}
    />
  );
}

export function BrandLogo({
  size = "md",
  compact = false,
  className,
}: {
  size?: "sm" | "md" | "lg";
  compact?: boolean;
  className?: string;
}) {
  const dimensions = sizes[size];
  return (
    <span
      role="img"
      aria-label="Adrenaline Tasks"
      className={twMerge(
        "inline-flex shrink-0 items-start gap-2.5 text-light-1000 dark:text-dark-1000",
        className,
      )}
    >
      <BrandMark className={dimensions.mark} />
      {!compact && (
        <span aria-hidden="true" className="flex flex-col">
          <span
            className={twMerge("block bg-current", dimensions.word)}
            style={{
              maskImage: "url(/branding/adrenaline-wordmark.png)",
              maskSize: "contain",
              maskRepeat: "no-repeat",
              maskPosition: "left top",
            }}
          />
          <span
            className={twMerge(
              "mt-1 font-semibold uppercase leading-none tracking-[0.22em] text-light-950 dark:text-dark-950",
              dimensions.descriptor,
            )}
          >
            Tasks
          </span>
        </span>
      )}
    </span>
  );
}

export function CompanyLogo({ className }: { className?: string }) {
  return (
    <span
      className={twMerge("inline-flex rounded bg-black px-4 py-3", className)}
    >
      <Image
        src="/branding/adrenaline-entertainment.png"
        alt="Adrenaline Entertainment"
        width={283}
        height={68}
        className="h-auto w-[154px]"
        unoptimized
      />
    </span>
  );
}
