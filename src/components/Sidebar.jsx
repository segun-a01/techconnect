import { Link, useNavigate, useLocation } from "react-router-dom";
import { Home, Search, MessageCircle, User } from "lucide-react";
import { useEffect, useState } from "react";
// import { supabase } from "../lib/supabaseClient";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../../lib/supabaseClient";
import ThemeToggle from "./ThemeToggle";

function Sidebar() {
  const [user, setUser] = useState(null);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_e, session) => {
        setUser(session?.user || null);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const navItem = (to, icon, label) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex items-center gap-4 px-4 py-3 rounded-full text-lg transition
          ${active ? "font-bold text-[var(--color-text)]" : "text-[var(--color-muted)] hover:bg-[var(--color-surface)]"}`}
      >
        <span className="text-xl">{icon}</span>
        <span className="hidden lg:inline">{label}</span>
      </Link>
    );
  };

  return (
    <div className="hidden lg:flex h-screen sticky top-0 flex-col justify-between py-4 px-2 border-r border-[var(--color-border)]">
      {" "}
      <div>
        <div className="px-4 py-3 text-2xl font-bold text-[#7C6FF0]">TC</div>

        <nav className="flex flex-col gap-1 mt-2">
          {navItem("/", <Home size={22} />, "Home")}
          {navItem("/explore", <Search size={22} />, "Explore")}
          {navItem("/chat", <MessageCircle size={22} />, "Chat")}
          {user && navItem("/profile", <User size={22} />, "Profile")}
        </nav>

        <button className="mt-4 w-full bg-[#7C6FF0] hover:bg-[#6C5CE7] transition text-white font-semibold rounded-full py-3 hidden lg:block">
          Post
        </button>
      </div>
      <div className="flex flex-col gap-2 px-2">
        <ThemeToggle className="self-start" />

        {user ? (
          <button
            onClick={handleLogout}
            className="text-left text-[var(--color-muted)] hover:text-red-400 transition px-4 py-2"
          >
            Logout
          </button>
        ) : (
          <Link to="/login" className="text-left text-[#7C6FF0] px-4 py-2">
            Login
          </Link>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
