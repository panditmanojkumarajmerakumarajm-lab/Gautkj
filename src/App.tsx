import React, { useEffect, useState } from "react";
import { UserProfile } from "./types";
import AuthScreen from "./components/AuthScreen";
import UserDashboard from "./components/UserDashboard";
import SubscriptionPage from "./components/SubscriptionPage";
import SupportSection from "./components/SupportSection";
import AdminPanel from "./components/AdminPanel";
import MusicWave from "./components/MusicWave";
import { motion, AnimatePresence } from "motion/react";
import { 
  LogOut, 
  Disc, 
  Mic, 
  CreditCard, 
  HelpCircle, 
  ShieldAlert, 
  MessageSquare,
  Sparkles,
  Menu,
  X,
  User
} from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"generator" | "subscription" | "support" | "admin">("generator");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const fetchUserProfile = async (uid: string) => {
    try {
      const response = await fetch(`/api/auth/me?uid=${uid}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserProfile(data.profile);
          localStorage.setItem("dj_vocal_session", JSON.stringify(data.profile));
          return data.profile;
        }
      }
    } catch (err) {
      console.error("Failed to load user profile from server:", err);
    }
    return null;
  };

  // Auth state observer
  useEffect(() => {
    const sessionStr = localStorage.getItem("dj_vocal_session");
    if (sessionStr) {
      try {
        const sessionProfile = JSON.parse(sessionStr) as UserProfile;
        setCurrentUser({ uid: sessionProfile.uid });
        setUserProfile(sessionProfile);

        // Direct non-premium to subscription on initial load
        if (sessionProfile.subscriptionStatus !== "Active" && sessionProfile.role !== "admin") {
          setActiveTab("subscription");
        } else {
          setActiveTab("generator");
        }
        
        // Fetch latest version from the server to sync status/role
        fetchUserProfile(sessionProfile.uid).then((latestProfile) => {
          if (latestProfile) {
            if (latestProfile.subscriptionStatus !== "Active" && latestProfile.role !== "admin") {
              setActiveTab("subscription");
            }
          }
        }).finally(() => {
          setLoading(false);
        });
        
        // Poll for updates every 10 seconds to keep dashboard state real-time (especially for subscription approval or vocal generations)
        const interval = setInterval(() => {
          fetchUserProfile(sessionProfile.uid);
        }, 10000);
        return () => clearInterval(interval);
      } catch (err) {
        console.error("Error parsing session:", err);
        localStorage.removeItem("dj_vocal_session");
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    } else {
      setCurrentUser(null);
      setUserProfile(null);
      setLoading(false);
    }
  }, []);

  const handleSignOut = async () => {
    localStorage.removeItem("dj_vocal_session");
    setCurrentUser(null);
    setUserProfile(null);
    setActiveTab("generator");
  };

  const handleAuthSuccess = (profile: UserProfile) => {
    setCurrentUser({ uid: profile.uid });
    setUserProfile(profile);
    if (profile.subscriptionStatus !== "Active" && profile.role !== "admin") {
      setActiveTab("subscription");
    } else {
      setActiveTab("generator");
    }
  };

  const isPremiumOrAdmin = userProfile?.subscriptionStatus === "Active" || userProfile?.role === "admin";

  // Nav Links definition
  const navLinks = isPremiumOrAdmin ? [
    { id: "generator", label: "DJ Studio", icon: Mic },
    { id: "subscription", label: "Premium Upgrade", icon: CreditCard },
    { id: "support", label: "Support System", icon: HelpCircle },
  ] : [
    { id: "subscription", label: "Premium Upgrade", icon: CreditCard },
  ];

  if (userProfile?.role === "admin") {
    navLinks.push({ id: "admin", label: "Admin Panel", icon: ShieldAlert });
  }

  return (
    <div id="main-app-root" className="min-h-screen bg-[#07070a] text-zinc-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white relative overflow-x-hidden">
      
      {/* Decorative neon gradient overlays */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-900/10 blur-[120px] pointer-events-none" />
      
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-zinc-400">
          <Disc className="w-12 h-12 text-rose-500 animate-spin mb-4" />
          <p className="text-sm font-semibold tracking-wide uppercase">Initializing Vocal Studio...</p>
        </div>
      ) : !currentUser ? (
        <div className="flex-1 flex items-center justify-center py-10">
          <AuthScreen onAuthSuccess={handleAuthSuccess} />
        </div>
      ) : (
        <>
          {/* Header */}
          <header id="app-header" className="sticky top-0 z-40 bg-[#07070a]/85 backdrop-blur-md border-b border-zinc-900/60 shadow-lg px-4 py-3.5">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              
              {/* Logo */}
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-tr from-rose-500 to-purple-600 rounded-xl text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                  <Disc className="w-5 h-5 animate-spin" style={{ animationDuration: "6s" }} />
                </div>
                <div>
                  <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1">
                    Dj Vocal Adda
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      AI v3
                    </span>
                  </h1>
                  <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Premium DJ Vocals</p>
                </div>
              </div>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = activeTab === link.id;
                  return (
                    <button
                      key={link.id}
                      onClick={() => setActiveTab(link.id as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)] border border-rose-400/50"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {link.label}
                    </button>
                  );
                })}
              </nav>

              {/* User profile info & signout */}
              <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800/80 rounded-xl px-3.5 py-1.5 text-xs">
                  <User className="w-4 h-4 text-rose-400" />
                  <div>
                    <span className="font-semibold text-white block truncate max-w-[120px]">{userProfile?.displayName}</span>
                    <span className="text-[10px] text-cyan-400 font-bold block capitalize">
                      {userProfile?.subscriptionStatus === "Active" ? "★ Premium User" : "Free Member"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2.5 bg-zinc-900 border border-zinc-800 hover:bg-rose-950/20 hover:border-rose-900/40 text-zinc-400 hover:text-rose-400 rounded-xl transition-all cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Menu Trigger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

            </div>
          </header>

          {/* Mobile Menu Panel */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden bg-[#07070a] border-b border-zinc-900 px-4 py-4 space-y-3 z-30 relative"
              >
                <div className="flex items-center gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-850">
                  <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{userProfile?.displayName}</p>
                    <p className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">
                      {userProfile?.subscriptionStatus === "Active" ? "★ Premium Membership" : "Free Account"}
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = activeTab === link.id;
                    return (
                      <button
                        key={link.id}
                        onClick={() => {
                          setActiveTab(link.id as any);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                          isActive
                            ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        <Icon className="w-4.5 h-4.5" />
                        {link.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-950/20 transition-all cursor-pointer border border-rose-900/30"
                >
                  <LogOut className="w-4.5 h-4.5" />
                  Sign Out of Studio
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Core Content Area */}
          <main className="flex-1 py-8 px-4 max-w-6xl w-full mx-auto">
            
            {/* Visual ambient audio waveform animation */}
            <div className="mb-6">
              <MusicWave />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === "generator" && (
                  <UserDashboard userProfile={userProfile} />
                )}

                {activeTab === "subscription" && (
                  <SubscriptionPage 
                    userProfile={userProfile} 
                    onProfileUpdate={(updated) => setUserProfile(updated)} 
                  />
                )}

                {activeTab === "support" && (
                  <SupportSection />
                )}

                {activeTab === "admin" && userProfile?.role === "admin" && (
                  <AdminPanel />
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Footer */}
          <footer id="app-footer" className="bg-[#040406] border-t border-zinc-900 py-6 px-4 text-center text-xs text-zinc-500 mt-10">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>© 2026 Dj Vocal Adda. Studio-grade AI voice rendering. All Rights Reserved.</p>
              <div className="flex gap-4">
                <button onClick={() => setActiveTab("generator")} className="hover:text-zinc-300">Vocal Studio</button>
                <button onClick={() => setActiveTab("subscription")} className="hover:text-zinc-300">Subscription</button>
                <button onClick={() => setActiveTab("support")} className="hover:text-zinc-300">Contact Support</button>
              </div>
            </div>
          </footer>

          {/* Floating WhatsApp Contact Button (Mandatory) */}
          <a
            href="https://wa.me/918955932061?text=Hello%20DJ%20Vocal%20Adda%2C%20I%20need%20assistance%20with%20vocals."
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 p-4 bg-green-500 text-white rounded-full shadow-[0_0_20px_rgba(34,197,94,0.5)] hover:bg-green-400 hover:scale-105 active:scale-95 transition-all cursor-pointer group flex items-center gap-2"
            title="Chat on WhatsApp"
            id="whatsapp-floating-btn"
          >
            <MessageSquare className="w-6 h-6 shrink-0" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out text-xs font-bold uppercase tracking-wider whitespace-nowrap">
              WhatsApp Support
            </span>
          </a>

        </>
      )}
    </div>
  );
}
