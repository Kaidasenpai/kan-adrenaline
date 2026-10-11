import { t } from "@lingui/core/macro";
import { useTheme } from "next-themes";
import { CgDarkMode } from "react-icons/cg";

const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "light" ? "dark" : "light");
  };

  return (
    <button
      onClick={toggleTheme}
      className="focus-visible:outline-brand-accent dark:focus-visible:outline-brand-lime flex h-11 w-11 items-center justify-center rounded-md transition-colors duration-150 hover:bg-light-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-dark-200"
      aria-label={
        resolvedTheme === "light"
          ? t`Switch to dark theme`
          : t`Switch to light theme`
      }
    >
      <CgDarkMode
        className={`h-4 w-4 text-light-900 transition-transform duration-200 dark:text-dark-900 ${
          resolvedTheme === "dark" ? "rotate-180" : "rotate-0"
        }`}
      />
    </button>
  );
};

export default ThemeToggle;
