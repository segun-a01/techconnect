import { useState } from "react";
// import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { Eye, EyeSlash } from "react-bootstrap-icons";

function Login() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isSignUp) {
      // 1. Create the account
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // 2. Create their profile row
      if (data.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({ id: data.user.id, username });

        if (profileError) {
          setError(profileError.message);
          setLoading(false);
          return;
        }
      }

      navigate("/");
    } else {
      // Login flow
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError(loginError.message);
        setLoading(false);
        return;
      }

      navigate("/");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex items-center justify-center px-4">
      <div className="bg-[var(--color-surface)] p-8 rounded-lg w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isSignUp ? "Create your TechConnect account" : "Welcome back"}
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignUp && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 outline-none focus:border-[#7C6FF0]"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 outline-none focus:border-[#7C6FF0]"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-[var(--color-bg)] text-[var(--color-text)] border border-[var(--color-border)] rounded px-3 py-2 pr-10 outline-none focus:border-[#7C6FF0]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-[#7C6FF0] transition"
            >
              {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-[#7C6FF0] hover:bg-[#6C5CE7] transition rounded px-3 py-2 font-semibold"
          >
            {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Log In"}
          </button>
        </form>

        <p className="text-sm text-[var(--color-muted)] mt-4 text-center">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[#7C6FF0] underline"
          >
            {isSignUp ? "Log in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
