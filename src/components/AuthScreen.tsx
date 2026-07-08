import React, { useState } from "react";
import { UserProfile } from "../types";
import { motion } from "motion/react";
import { Mail, Lock, User, LogIn, UserPlus, Loader2, Disc } from "lucide-react";

interface AuthScreenProps {
  onAuthSuccess: (profile: UserProfile) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Handle Login via Server API
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email: email.trim(), password })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Authentication failed.");
        }

        // On success, save session to localStorage and notify parent
        localStorage.setItem("dj_vocal_session", JSON.stringify(data.profile));
        onAuthSuccess(data.profile);
      } else {
        // Handle Signup via Server API
        if (!displayName) {
          setError("Display Name is required.");
          setLoading(false);
          return;
        }

        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
            displayName: displayName.trim()
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Signup failed.");
        }

        // On success, save session to localStorage and notify parent
        localStorage.setItem("dj_vocal_session", JSON.stringify(data.profile));
        onAuthSuccess(data.profile);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message || "Authentication failed. Please check details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen-container" className="max-w-md w-full mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-2xl p-8 shadow-[0_0_30px_rgba(244,63,94,0.15)] flex flex-col gap-6"
      >
        <div className="text-center space-y-1.5">
          <div className="inline-flex p-3 bg-rose-500/10 rounded-full text-rose-500 border border-rose-500/20 mb-2">
            <Disc className="w-8 h-8 animate-spin" style={{ animationDuration: "3s" }} />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">DJ VOCAL ADDA</h1>
          <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Premium AI Vocal Studio</p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-900/50 rounded-xl p-3 text-xs text-red-400 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Display Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500 transition-all shadow-inner"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500 transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500 transition-all shadow-inner"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Authenticating...
              </>
            ) : isLogin ? (
              <>
                <LogIn className="w-4.5 h-4.5" /> Sign In to Studio
              </>
            ) : (
              <>
                <UserPlus className="w-4.5 h-4.5" /> Create Free Account
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-zinc-800">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
          >
            {isLogin ? "New to DJ Vocal Adda? Sign Up Here" : "Already have an account? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
