import { useTheme } from "../context/ThemeContext";
import { MoonStarsFill, SunFill } from "react-bootstrap-icons";

function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative w-14 h-7 rounded-full transition-colors duration-300 flex items-center px-1 shrink-0 ${className}`}
      style={{ backgroundColor: theme === "dark" ? "#374151" : "#7C6FF0" }}
    >
      <span
        className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center transition-transform duration-300"
        style={{
          transform: theme === "dark" ? "translateX(0px)" : "translateX(28px)",
        }}
      >
        {theme === "dark" ? (
          <MoonStarsFill size={11} className="text-[#374151]" />
        ) : (
          <SunFill size={12} className="text-[#F5A623]" />
        )}
      </span>
    </button>
  );
}

export default ThemeToggle;
