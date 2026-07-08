import React, { useState } from "react";
import { UserProfile } from "../types";
import { motion } from "motion/react";
import { 
  Sparkles, 
  Check, 
  Flame, 
  CreditCard, 
  ShieldCheck, 
  Loader2, 
  Upload, 
  Image as ImageIcon,
  MessageSquare,
  ExternalLink
} from "lucide-react";

interface SubscriptionPageProps {
  userProfile: UserProfile | null;
  onProfileUpdate: (updated: UserProfile) => void;
}

export default function SubscriptionPage({ userProfile, onProfileUpdate }: SubscriptionPageProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileName(file.name);
    setLoading(true);

    try {
      // 1. Send manual pending request to Admin in database
      const response = await fetch("/api/auth/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          uid: userProfile?.uid,
          subscriptionStatus: "Pending"
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update subscription status");
      }

      onProfileUpdate(data.profile);

      // Show localized instructions
      alert(
        "✓ Payment Screenshot Selected!\n\nअब 'Send Screenshot on WhatsApp' button par touch karein aur WhatsApp par admin ko screenshot bhejein taaki aapka account turant active ho sake!"
      );
    } catch (err: any) {
      console.error("Error setting pending request:", err);
      alert("Failed to register request. Please try again or WhatsApp us directly.");
    } finally {
      setLoading(false);
    }
  };

  const openWhatsAppChat = () => {
    if (!userProfile) return;
    const msg = `Hello DJ Vocal Adda, I have paid ₹119 for the Monthly Premium subscription. My email ID is: ${userProfile.email}. Please approve my subscription. I am sending my payment screenshot here.`;
    const url = `https://wa.me/918955932061?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const statusColors = {
    Active: "text-green-400 border-green-500 bg-green-950/40 shadow-[0_0_15px_rgba(34,197,94,0.2)]",
    Pending: "text-amber-400 border-amber-500 bg-amber-950/40 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse",
    Expired: "text-red-400 border-red-500 bg-red-950/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
    None: "text-zinc-400 border-zinc-700 bg-zinc-900/40"
  };

  return (
    <div id="subscription-container" className="max-w-4xl mx-auto my-6 px-4">
      {/* Visual Header */}
      <div className="text-center mb-10">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold mb-4"
        >
          <Flame className="w-4 h-4 text-rose-500 animate-bounce" />
          GO UNLIMITED WITH PREMIUM
        </motion.div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
          Dj Vocal Adda <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-400">Premium</span>
        </h1>
        <p className="text-zinc-400 mt-2 text-sm md:text-base">Experience studio-grade, AI-powered DJ announcements instantly</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Left Side: Membership Benefits Card */}
        <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 md:p-8 hover:border-zinc-750 transition-colors shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Plan Rate</p>
              <p className="text-3xl font-extrabold text-white mt-1">₹119<span className="text-sm text-zinc-400 font-normal"> / month</span></p>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
          </div>

          <p className="text-zinc-300 text-sm mb-6">
            Get instant access to state-of-the-art voice generation tailored for massive stage performance and high-impact bass feel.
          </p>

          <div className="space-y-3 mb-8">
            {[
              "Unlimited DJ Vocals for 1 Month",
              "Bypass Admin Manual Vocal Approval completely",
              "Vocals are generated instantly within seconds",
              "High-Impact AI DJ Voice Generation",
              "Crisp Energetic Male Vocal Style (Brian)",
              "Polished Glamorous Female Vocal Style (Salli)",
              "Studio quality, clean MP3 audio files",
              "Unlimited Downloadable Files & Vocal History",
            ].map((benefit, i) => (
              <div key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                <div className="p-0.5 rounded-full bg-cyan-950 text-cyan-400 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-4 text-center">
            <p className="text-xs text-zinc-400 flex items-center justify-center gap-1.5 mb-1">
              <ShieldCheck className="w-4 h-4 text-rose-500" /> Secure Subscription Verification
            </p>
            <p className="text-[11px] text-zinc-500">
              Payments are verified manually via WhatsApp. Pay on the payment link, select screenshot and send us on WhatsApp for instant activation!
            </p>
          </div>
        </div>

        {/* Right Side: Account Status & Activation Request Card */}
        <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-lg">
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Subscription Upgrade (₹119 Plan)</h3>
            <p className="text-xs text-zinc-400">Follow these simple steps to unlock DJ Studio</p>
          </div>

          {userProfile && (
            <div className="space-y-6">
              {/* Account Status Card */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${statusColors[userProfile.subscriptionStatus]}`}>
                <div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase">Your Status</p>
                  <p className="text-lg font-bold mt-0.5 capitalize">{userProfile.subscriptionStatus === "None" ? "Not Subscribed" : userProfile.subscriptionStatus}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-400">Expiry Date</p>
                  <p className="text-sm font-semibold mt-0.5 text-white">
                    {userProfile.subscriptionExpiry || "No Expiry / Upgrade Needed"}
                  </p>
                </div>
              </div>

              {userProfile.subscriptionStatus === "None" || userProfile.subscriptionStatus === "Expired" || userProfile.subscriptionStatus === "Pending" ? (
                <div className="space-y-5">
                  {/* Step 1: Payment Link */}
                  <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-4 space-y-3">
                    <p className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rose-500 text-white text-xs font-bold">1</span>
                      Payment Link par Payment karein
                    </p>
                    <p className="text-xs text-zinc-400">
                      Neeche diye gaye link par click karke ₹119 ka payment safal karein aur screenshot le lein.
                    </p>
                    <a
                      href="https://upilinks.in/payment-link/upi988144775"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(244,63,94,0.35)] cursor-pointer text-sm"
                    >
                      <CreditCard className="w-4 h-4" /> Pay ₹119 Online <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Step 2: Select/Upload Screenshot image */}
                  <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-4 space-y-3">
                    <p className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500 text-white text-xs font-bold">2</span>
                      Payment Screenshot Select karein
                    </p>
                    <p className="text-xs text-zinc-400">
                      Payment karne ke baad apna screenshot select karein. Touch karte hi WhatsApp khul jayega.
                    </p>

                    <div>
                      <input
                        type="file"
                        id="screenshot-file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="screenshot-file"
                        className="flex flex-col items-center justify-center border border-dashed border-zinc-800 hover:border-cyan-500/50 rounded-xl p-5 bg-zinc-900/40 hover:bg-zinc-900 cursor-pointer transition-all gap-1.5"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                            <span className="text-xs text-zinc-400">Registering Request...</span>
                          </>
                        ) : selectedFile ? (
                          <>
                            <ImageIcon className="w-6 h-6 text-green-400" />
                            <span className="text-xs text-green-400 font-semibold truncate max-w-[200px]">{fileName}</span>
                            <span className="text-[10px] text-zinc-500">Click to change image</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-zinc-500" />
                            <span className="text-xs text-zinc-300 font-semibold">Touch to Upload Image</span>
                            <span className="text-[10px] text-zinc-500">PNG, JPG or JPEG screenshot</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Step 3: Send on WhatsApp */}
                  <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-4 space-y-3">
                    <p className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-xs font-bold">3</span>
                      WhatsApp par Screenshot Bhejein
                    </p>
                    <p className="text-xs text-zinc-400">
                      Neeche button par touch karke WhatsApp kholein aur screenshot admin ko send karein taaki subscription active ho sake.
                    </p>

                    <button
                      onClick={openWhatsAppChat}
                      className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(34,197,94,0.35)] cursor-pointer text-sm"
                    >
                      <MessageSquare className="w-4.5 h-4.5" /> Send Screenshot on WhatsApp
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-green-950/20 border border-green-900/50 rounded-xl p-6 text-center space-y-4">
                  <div className="inline-flex p-3 rounded-full bg-green-950/80 text-green-400 border border-green-900 shadow-md">
                    <ShieldCheck className="w-8 h-8 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-green-400 text-lg">✓ Premium Membership Active</h4>
                    <p className="text-xs text-zinc-300 mt-1">
                      Aapka ₹119 Premium Upgrade safaltapoorvak active hai! Ab aap DJ Studio me jakar bina kisi approval ke unlimited DJ vocal clips bana sakte hain.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
