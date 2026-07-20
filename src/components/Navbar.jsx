import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useTheme } from "../context/ThemeContext";

function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    // Keep navbar in sync if user logs in/out in another tab
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <nav className="bg-[var(--color-surface)] border-b border-gray-800 px-4 py-3">
      <div className="max-w-xl mx-auto flex items-center justify-between">
        <Link to="/" className="text-lg font-bold text-[#7C6FF0]">
          TechConnect
        </Link>

        <div className="flex items-center gap-4 text-sm">
          <Link
            to="/"
            className="text-[var(--color-muted)] hover:text-[#7C6FF0] transition"
          >
            Home
          </Link>

          {user ? (
            <>
              <Link
                to="/profile"
                className="text-[var(--color-muted)] hover:text-[#7C6FF0] transition"
              >
                Profile
              </Link>
              <Link
                to="/chat"
                className=" text-[var(--color-muted)] hover:text-[#7C6FF0] transition"
              >
                Chat
              </Link>
              <button
                onClick={handleLogout}
                className="text-[var(--color-muted)] hover:text-red-400 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="hover:text-[#7C6FF0] transition">
              Login
            </Link>
          )}

          <button onClick={toggleTheme} className="text-lg">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
