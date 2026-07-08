import React, { useState, useEffect, useRef } from "react";
import { UserProfile, VocalRequest } from "../types";
import { motion } from "motion/react";
import { 
  Sparkles, 
  Send, 
  Mic, 
  Volume2, 
  Download, 
  History, 
  Loader2, 
  AlertTriangle,
  Play,
  Pause,
  Sliders,
  Music4
} from "lucide-react";
import Equalizer from "./Equalizer";

export const CHANNELS_VOICES = [
  { id: "en_us_002", name: "DJ Pinky (High-Energy / Hype Hindi Girl)", desc: "Super energetic, loud, and crisp voice - perfect for powerful dance beats and song drops.", color: "border-rose-500 bg-rose-950/20 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]" },
  { id: "en_us_001", name: "DJ Priya (Sweet & Clear Indian Girl)", desc: "Sweet, clear, and smooth delivery - perfect for romantic remixes, melodies, and premium signature tags.", color: "border-purple-500 bg-purple-950/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]" },
  { id: "en_uk_003", name: "DJ Aisha (Smooth & Modern Hinglish Style)", desc: "Elegant accent with high clarity - perfect for modern club mixes and premium urban tracks.", color: "border-pink-500 bg-pink-950/20 text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.1)]" },
];

export function getVoiceName(vType: string): string {
  const v = CHANNELS_VOICES.find(item => item.id === vType);
  if (v) return v.name;
  if (vType === "male") return "DJ Pinky (Hype Female)";
  if (vType === "female") return "DJ Priya (Sweet Female)";
  return vType;
}

interface UserDashboardProps {
  userProfile: UserProfile | null;
}

export default function UserDashboard({ userProfile }: UserDashboardProps) {
  const [requests, setRequests] = useState<VocalRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form states
  const [djName, setDjName] = useState<string>("");
  const [voiceType, setVoiceType] = useState<string>("en_us_002");

  // Web Audio EQ/Vocal FX States
  const [eqPreset, setEqPreset] = useState<"dry" | "echo" | "radio" | "reverb">("echo");
  const [echoFeedback, setEchoFeedback] = useState<number>(0.45);
  const [echoDelayTime, setEchoDelayTime] = useState<number>(0.32);

  // Audio playing state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  // Audio Context and node references for cleanup
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Fetch request history from Server API
  const fetchHistory = async (showLoading = true) => {
    if (!userProfile) return;
    if (showLoading) setLoadingHistory(true);
    try {
      const response = await fetch(`/api/requests?userId=${userProfile.uid}`);
      if (response.ok) {
        const list = await response.json();
        setRequests(list);
      }
    } catch (err) {
      console.error("Error loading request history:", err);
    } finally {
      if (showLoading) setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory(true);

    // Poll for status changes (e.g. Completed vocal generation) every 8 seconds
    const interval = setInterval(() => {
      fetchHistory(false);
    }, 8000);

    return () => clearInterval(interval);
  }, [userProfile]);

  // Clean up audio and AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, [audioElement]);

  // Play/Pause Audio Handler using browser-native Web Audio API for Studio Effects
  const handlePlayAudio = (id: string, url: string) => {
    if (playingAudioId === id) {
      if (audioElement) {
        audioElement.pause();
      }
      setPlayingAudioId(null);
      setAnalyserNode(null);
    } else {
      if (audioElement) {
        audioElement.pause();
      }

      const audio = new Audio(url);
      audio.crossOrigin = "anonymous"; // Safe for Web Audio API pipe

      try {
        // Initialize or resume browser audio context on user action
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === "suspended") {
          ctx.resume();
        }

        // Create Web Audio nodes
        const source = ctx.createMediaElementSource(audio);
        const filter = ctx.createBiquadFilter();
        const delay = ctx.createDelay(2.0);
        const feedback = ctx.createGain();
        const wetGain = ctx.createGain();
        const dryGain = ctx.createGain();
        const analyser = ctx.createAnalyser();

        analyser.fftSize = 64;

        // Apply selected Vocal FX preset
        if (eqPreset === "dry") {
          // Direct bypass line: Source -> Analyser -> Output
          source.connect(analyser);
          analyser.connect(ctx.destination);
        } else if (eqPreset === "echo" || eqPreset === "reverb") {
          // Setup beautiful echoing delay loop
          delay.delayTime.value = echoDelayTime;
          feedback.gain.value = echoFeedback;

          // Highpass Filter at 140Hz removes low rumble, making the girl vocal extremely sharp & clean
          filter.type = "highpass";
          filter.frequency.value = 140;

          // Peaking filter to boost treble presence (3.5 kHz) for that perfect radio-shine feel
          const peakFilter = ctx.createBiquadFilter();
          peakFilter.type = "peaking";
          peakFilter.frequency.value = 3500;
          peakFilter.Q.value = 1.0;
          peakFilter.gain.value = 5.0; // Boost treble high end

          // Connect dry (clean vocal) channel
          dryGain.gain.value = 1.0;
          source.connect(peakFilter);
          peakFilter.connect(filter);
          
          filter.connect(dryGain);
          dryGain.connect(analyser);

          // Connect wet (echo delay) channel
          filter.connect(delay);
          delay.connect(feedback);
          feedback.connect(delay); // feedback loop

          wetGain.gain.value = eqPreset === "reverb" ? 0.45 : 0.35;
          delay.connect(wetGain);
          wetGain.connect(analyser);

          analyser.connect(ctx.destination);
        } else if (eqPreset === "radio") {
          // Bandpass filter to create classic Telephone/Megaphone effect
          filter.type = "bandpass";
          filter.frequency.value = 1800;
          filter.Q.value = 1.8;

          // Short slapback delay
          delay.delayTime.value = 0.22;
          feedback.gain.value = 0.25;

          source.connect(filter);
          filter.connect(dryGain);
          dryGain.connect(analyser);

          filter.connect(delay);
          delay.connect(feedback);
          feedback.connect(delay);

          wetGain.gain.value = 0.25;
          delay.connect(wetGain);
          wetGain.connect(analyser);

          analyser.connect(ctx.destination);
        }

        audio.play().catch(e => console.error("Playback failed:", e));
        
        setPlayingAudioId(id);
        setAudioElement(audio);
        setAnalyserNode(analyser);

        audio.onended = () => {
          setPlayingAudioId(null);
          setAnalyserNode(null);
        };
      } catch (err) {
        console.warn("Web Audio API not fully initialized (re-creating connection):", err);
        // Fallback to basic audio play if Web Audio fails or source is already connected
        audio.play().catch(e => console.error("Playback failed:", e));
        setPlayingAudioId(id);
        setAudioElement(audio);
        setAnalyserNode(null);

        audio.onended = () => {
          setPlayingAudioId(null);
          setAnalyserNode(null);
        };
      }
    }
  };

  // Submit voice generation request via Server API
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    if (!djName) return;

    // Check if subscription is Active
    if (userProfile.subscriptionStatus !== "Active") {
      alert("Active subscription is required to submit vocal requests. Please activate from the subscription page!");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        userId: userProfile.uid,
        userName: userProfile.displayName || "User",
        djName: djName.trim(),
        userText: djName.trim(),
        voiceType,
      };

      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit request.");
      }
      
      // Reset form
      setDjName("");
      
      alert("Vocal request submitted successfully! Your custom DJ Vocal is generating automatically and will be ready in 10-15 seconds. Please watch the history list below!");
      fetchHistory(false);
    } catch (err: any) {
      console.error("Error submitting request:", err);
      alert(err.message || "Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="user-dashboard-container" className="space-y-10 max-w-5xl mx-auto px-4 my-6">
      
      {/* Visual DJ Beats Equalizer block */}
      <div className="w-full">
        <Equalizer analyser={analyserNode} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Generator Form (7 cols) */}
        <div className="lg:col-span-7 bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 md:p-8 hover:border-zinc-750 transition-all shadow-xl">
          <div className="flex items-center gap-2 mb-6">
            <Mic className="w-6 h-6 text-rose-500" />
            <h2 className="text-xl font-bold text-white tracking-tight">DJ Female Vocal Generator</h2>
          </div>

          {userProfile?.subscriptionStatus !== "Active" && (
            <div className="mb-6 p-4 bg-amber-950/40 border border-amber-900/50 rounded-xl text-xs text-amber-400 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Subscription Activation Required</p>
                <p className="mt-1">
                  You cannot submit requests unless you have an active premium tier (₹119/Month). Visit the Subscription page to submit an activation request.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmitRequest} className="space-y-5">
            {/* DJ Vocal Text Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                <span>Enter DJ Name or Text <span className="text-rose-500">*</span></span>
                <span className="text-[10px] text-zinc-500 normal-case font-normal">(जैसे: DJ Gautam या DJ Suman)</span>
              </label>
              <textarea
                required
                rows={3}
                value={djName}
                onChange={(e) => setDjName(e.target.value)}
                placeholder="Example: DJ Gautam Tiwari (Gemini automatically converted into super high-energy club drop voice script!)"
                maxLength={180}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all shadow-inner resize-none"
              />
              <div className="flex justify-between text-[11px] text-zinc-500 px-1">
                <span>Enter name and Gemini will craft the voice script!</span>
                <span>{djName.length}/180</span>
              </div>
            </div>

            {/* Voice Selection Options */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                Select Female DJ Voice Style <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 border border-zinc-800 rounded-xl p-2 bg-zinc-950/50">
                {CHANNELS_VOICES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVoiceType(v.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                      voiceType === v.id
                        ? `${v.color} border-2`
                        : "border-zinc-850 bg-zinc-900/40 text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Volume2 className={`w-4 h-4 ${voiceType === v.id ? "animate-pulse" : ""}`} />
                      <span className="font-bold text-xs text-white">{v.name}</span>
                      {voiceType === v.id && (
                        <span className="ml-auto text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          Active Selection
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed font-normal">{v.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Vocal FX & Equalizer Station */}
            <div className="space-y-4 border border-zinc-800 rounded-xl p-4 bg-zinc-950/40">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-900">
                <Sliders className="w-4.5 h-4.5 text-rose-500" />
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Vocal FX & EQ Studio</span>
                <span className="ml-auto text-[10px] text-zinc-500 italic">(Real-time effects)</span>
              </div>

              {/* Preset buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "echo", name: "Club Echo", desc: "Classic DJ delay" },
                  { id: "reverb", name: "Stadium Reverb", desc: "Wide echo space" },
                  { id: "radio", name: "Megaphone", desc: "Radio EQ style" },
                  { id: "dry", name: "Dry (No FX)", desc: "Original sound" }
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setEqPreset(preset.id as any)}
                    className={`py-2 px-1 text-center rounded-lg border text-[10px] cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 ${
                      eqPreset === preset.id
                        ? "border-rose-500 bg-rose-950/25 text-rose-400 font-semibold"
                        : "border-zinc-900 bg-zinc-950/80 text-zinc-400 hover:border-zinc-800 hover:text-zinc-300"
                    }`}
                  >
                    <span>{preset.name}</span>
                    <span className="text-[8px] text-zinc-500 font-normal">{preset.desc}</span>
                  </button>
                ))}
              </div>

              {/* Slider Controls */}
              {eqPreset !== "dry" && (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-400">
                      <span>Echo Feedback Level (गूंज):</span>
                      <span className="text-rose-400 font-semibold font-mono">{Math.round(echoFeedback * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="0.85"
                      step="0.05"
                      value={echoFeedback}
                      onChange={(e) => setEchoFeedback(parseFloat(e.target.value))}
                      className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-400">
                      <span>Echo Delay Time (देरी):</span>
                      <span className="text-rose-400 font-semibold font-mono">{Math.round(echoDelayTime * 1000)} ms</span>
                    </div>
                    <input
                      type="range"
                      min="0.15"
                      max="0.8"
                      step="0.05"
                      value={echoDelayTime}
                      onChange={(e) => setEchoDelayTime(parseFloat(e.target.value))}
                      className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Request Button */}
            <button
              type="submit"
              disabled={submitting || userProfile?.subscriptionStatus !== "Active"}
              className={`w-full py-3.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                userProfile?.subscriptionStatus !== "Active" ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Submitting Request...
                </>
              ) : (
                <>
                  <Send className="w-4.5 h-4.5" /> Submit Vocal Request
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: History (5 cols) */}
        <div className="lg:col-span-5 bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 hover:border-zinc-750 transition-all shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">Vocal History</h2>
            </div>
            <button onClick={fetchHistory} className="text-xs text-rose-400 hover:underline">
              Refresh
            </button>
          </div>

          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-sm">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500 mb-2" />
              Loading history...
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 text-zinc-500 text-xs">
              <Mic className="w-10 h-10 mx-auto text-zinc-700 mb-2" />
              Your submitted requests will appear here. Submit your first DJ request above!
            </div>
          ) : (
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-zinc-950 border border-zinc-850 hover:border-zinc-800 rounded-xl p-4 transition-all space-y-2.5"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-rose-400 font-bold bg-rose-950/40 border border-rose-900/50 px-2 py-0.5 rounded">
                          {req.djName}
                        </span>
                        <span className="text-[9px] font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-900/50 px-1.5 py-0.5 rounded">
                          {getVoiceName(req.voiceType)}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 block mt-1">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                        req.status === "Completed" ? "bg-green-950 text-green-400 border border-green-900" :
                        req.status === "Processing" ? "bg-amber-950 text-amber-400 border border-amber-900 animate-pulse" :
                        req.status === "Approved" ? "bg-cyan-950 text-cyan-400 border border-cyan-900" :
                        req.status === "Rejected" ? "bg-red-950 text-red-400 border border-red-900" :
                        "bg-zinc-800 text-zinc-400"
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-zinc-300 text-xs italic break-words">"{req.userText}"</p>

                  {/* Enhanced Text Output if Completed */}
                  {req.status === "Completed" && req.enhancedText && (
                    <div className="bg-zinc-900/50 rounded-lg p-2.5 border border-zinc-850/50 text-[11px] text-zinc-400">
                      <p className="font-semibold text-rose-400 mb-0.5">Enhanced Vocal Announcement:</p>
                      <p className="italic font-mono">"{req.enhancedText}"</p>
                    </div>
                  )}

                  {/* Audio Download and Play options if Completed */}
                  {req.status === "Completed" && req.audioUrl ? (
                    <div className="flex gap-2 pt-1.5 border-t border-zinc-900">
                      <button
                        onClick={() => handlePlayAudio(req.id, req.audioUrl!)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          playingAudioId === req.id 
                            ? "bg-rose-600 text-white" 
                            : "bg-zinc-900 text-zinc-300 hover:bg-zinc-850"
                        }`}
                      >
                        {playingAudioId === req.id ? (
                          <>
                            <Pause className="w-3.5 h-3.5" /> Pause Vocal
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-rose-500" /> Play Vocal
                          </>
                        )}
                      </button>
                      <a
                        href={req.audioUrl}
                        download={`vocal-${req.id}.mp3`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                        title="Download MP3"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ) : req.status === "Rejected" ? (
                    <div className="text-[10px] text-red-400 pt-1 border-t border-zinc-900 italic">
                      Request rejected by admin. Please revise text parameters.
                    </div>
                  ) : (
                    <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-900 italic animate-pulse">
                      Waiting for approval & vocal rendering. Check back soon!
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
