import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Home, Search, MessageCircle, User } from "lucide-react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
// import { supabase } from "../lib/supabaseClient";

function MobileNav() {
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const item = (to, icon) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        className={`flex-1 flex justify-center items-center py-3 text-2xl ${
          active ? "text-[#7C6FF0]" : "text-[var(--color-muted)]"
        }`}
      >
        {icon}
      </Link>
    );
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex z-50">
      {item("/", <Home size={24} />)}
      {item("/explore", <Search size={24} />)}
      {item("/chat", <MessageCircle size={24} />)}
      {user && item("/profile", <User size={24} />)}
      {user && (
        <button
          onClick={handleLogout}
          className="flex-1 flex justify-center items-center py-3 text-2xl text-[var(--color-muted)] hover:text-red-400 transition"
        >
          <LogOut size={24} />
        </button>
      )}
    </div>
  );
}

export default MobileNav;
