import React, { useEffect, useState } from "react";
import { UserProfile, VocalRequest, SupportLink } from "../types";
import { motion } from "motion/react";
import { 
  Users, 
  ListMusic, 
  Settings, 
  HelpCircle, 
  Check, 
  X, 
  Play, 
  Calendar, 
  Plus, 
  Trash2, 
  RefreshCw, 
  ShieldAlert,
  Loader2,
  ExternalLink
} from "lucide-react";
import { getVoiceName } from "./UserDashboard";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"users" | "prompt" | "support">("users");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<VocalRequest[]>([]);
  const [supportLinks, setSupportLinks] = useState<SupportLink[]>([]);
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Form states
  const [newPrompt, setNewPrompt] = useState<string>("");
  const [newLinkTitle, setNewLinkTitle] = useState<string>("");
  const [newLinkUrl, setNewLinkUrl] = useState<string>("");

  // Manual payment state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [manualExpiry, setManualExpiry] = useState<string>("");

  // Direct activation via Email ID
  const [approveEmail, setApproveEmail] = useState<string>("");
  const [approving, setApproving] = useState<boolean>(false);

  // Load Admin Data from Server API
  const loadAdminData = async () => {
    setLoading(true);
    try {
      // 1. Load users
      const usersRes = await fetch("/api/admin/users");
      const usersList = usersRes.ok ? await usersRes.json() : [];
      setUsers(usersList);

      // 2. Load requests
      const reqRes = await fetch("/api/admin/requests");
      const reqList = reqRes.ok ? await reqRes.json() : [];
      setRequests(reqList);

      // 3. Load support links
      const linksRes = await fetch("/api/support-links");
      const linksList = linksRes.ok ? await linksRes.json() : [];
      setSupportLinks(linksList);

      // 4. Load AI prompt
      const promptRes = await fetch("/api/admin/settings/prompt");
      if (promptRes.ok) {
        const data = await promptRes.json();
        setSystemPrompt(data.systemPrompt);
        setNewPrompt(data.systemPrompt);
      } else {
        const defaultPrompt = "You are a professional DJ voice artist. Convert normal text into a powerful DJ announcement style with energy, bass feeling and stage performance.";
        setSystemPrompt(defaultPrompt);
        setNewPrompt(defaultPrompt);
      }

    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Handle Approve Request via Server API
  const handleApprove = async (id: string) => {
    try {
      const res = await fetch("/api/admin/requests/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "Approved" })
      });
      if (res.ok) {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "Approved" } : r));
      }
    } catch (err) {
      console.error("Error approving request:", err);
    }
  };

  // Handle Reject Request via Server API
  const handleReject = async (id: string) => {
    try {
      const res = await fetch("/api/admin/requests/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "Rejected" })
      });
      if (res.ok) {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "Rejected" } : r));
      }
    } catch (err) {
      console.error("Error rejecting request:", err);
    }
  };

  // Handle Voice Generation via Backend API
  const handleGenerate = async (id: string) => {
    setProcessingId(id);
    try {
      // First update status to processing locally
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: "Processing" } : r));

      const res = await fetch("/api/generate-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: id })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed generation");
      }

      // Success, reload requests
      await loadAdminData();
      alert("Vocal generated successfully!");
    } catch (err: any) {
      console.error("Error generating voice:", err);
      alert(`Generation failed: ${err.message}`);
      await loadAdminData();
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Update User Subscription Status via Server API
  const handleUpdateSubscription = async (userId: string, status: "Active" | "Pending" | "Expired" | "None", expiryDate?: string) => {
    try {
      let finalExpiry = expiryDate;
      if (!expiryDate && status === "Active") {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        finalExpiry = d.toISOString().split("T")[0];
      }

      const res = await fetch("/api/admin/users/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          subscriptionStatus: status,
          subscriptionExpiry: finalExpiry || ""
        })
      });

      if (res.ok) {
        setUsers(prev => prev.map(u => u.uid === userId ? { ...u, subscriptionStatus: status, subscriptionExpiry: finalExpiry || "" } : u));
        setEditingUserId(null);
        alert("User subscription updated successfully!");
      } else {
        throw new Error("Failed to update user subscription status on backend");
      }
    } catch (err) {
      console.error("Error updating subscription:", err);
      alert("Failed to update subscription. Please try again.");
    }
  };

  // Direct activation via User Email ID
  const handleApproveByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveEmail) return;
    setApproving(true);
    try {
      const res = await fetch("/api/admin/users/approve-by-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: approveEmail })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Successfully approved subscription for ${data.email}!\nExpiry date set to: ${data.expiry}`);
        setApproveEmail("");
        await loadAdminData(); // Refresh the user list
      } else {
        throw new Error(data.error || "Failed to approve user.");
      }
    } catch (err: any) {
      console.error("Error approving user by email:", err);
      alert(err.message || "Failed to approve user subscription.");
    } finally {
      setApproving(false);
    }
  };

  // Save AI system prompt via Server API
  const handleSavePrompt = async () => {
    try {
      const res = await fetch("/api/admin/settings/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt: newPrompt })
      });

      if (res.ok) {
        setSystemPrompt(newPrompt);
        alert("AI System Prompt saved successfully!");
      }
    } catch (err) {
      console.error("Error saving prompt:", err);
    }
  };

  // Add support link via Server API
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkTitle || !newLinkUrl) return;

    try {
      const res = await fetch("/api/support-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newLinkTitle, url: newLinkUrl })
      });

      if (res.ok) {
        const data = await res.json();
        setSupportLinks(prev => [...prev, data.link]);
        setNewLinkTitle("");
        setNewLinkUrl("");
        alert("Support link added successfully!");
      }
    } catch (err) {
      console.error("Error adding support link:", err);
    }
  };

  // Delete support link via Server API
  const handleDeleteLink = async (id: string) => {
    try {
      const res = await fetch(`/api/support-links?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setSupportLinks(prev => prev.filter(l => l.id !== id));
        alert("Support link deleted successfully!");
      }
    } catch (err) {
      console.error("Error deleting link:", err);
    }
  };

  return (
    <div id="admin-panel-container" className="bg-zinc-950/80 backdrop-blur-md rounded-2xl border border-zinc-800 p-6 md:p-8 max-w-6xl mx-auto my-6 shadow-[0_0_30px_rgba(244,63,94,0.15)]">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800 pb-6 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-cyan-400 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-500 animate-pulse" />
            Admin Dashboard
          </h2>
          <p className="text-zinc-400 text-sm mt-1">Configure vocals, subscriptions, system prompts, and links</p>
        </div>
        <button
          onClick={loadAdminData}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-sm transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Data
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-zinc-850 pb-4">
        {[
          { id: "users", label: "Premium Activator & Accounts", icon: Users },
          { id: "prompt", label: "Gemini Prompt Control", icon: Settings },
          { id: "support", label: "Support Contact System", icon: HelpCircle },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                isActive 
                  ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] border border-rose-400" 
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-4" />
          <p className="font-medium">Loading panel data...</p>
        </div>
      ) : (
        <div>
          {/* Requests Tab */}
          {activeTab === "requests" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-zinc-300 border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-sm bg-zinc-900/50">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">DJ Name</th>
                    <th className="py-3 px-4">Custom Text</th>
                    <th className="py-3 px-4">Voice</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {requests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-zinc-500">No requests found. Create a request from the generator!</td>
                    </tr>
                  ) : (
                    requests.map((req) => (
                      <tr key={req.id} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="py-4 px-4 font-medium text-white">{req.userName}</td>
                        <td className="py-4 px-4">
                          <span className="px-2 py-1 rounded bg-rose-950/40 text-rose-400 border border-rose-900/40 text-xs font-semibold">
                            {req.djName}
                          </span>
                        </td>
                        <td className="py-4 px-4 max-w-xs truncate" title={req.userText}>
                          {req.userText}
                        </td>
                        <td className="py-4 px-4 capitalize">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            req.voiceType.includes("female") || req.voiceType === "female" ? "bg-purple-950 text-purple-400 border border-purple-900" : "bg-cyan-950 text-cyan-400 border border-cyan-900"
                          }`}>
                            {getVoiceName(req.voiceType)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            req.status === "Completed" ? "bg-green-950/80 text-green-400 border border-green-800" :
                            req.status === "Processing" ? "bg-amber-950/80 text-amber-400 border border-amber-800 animate-pulse" :
                            req.status === "Approved" ? "bg-cyan-950/80 text-cyan-400 border border-cyan-800" :
                            req.status === "Rejected" ? "bg-red-950/80 text-red-400 border border-red-800" :
                            "bg-zinc-800 text-zinc-400"
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex gap-2">
                            {req.status === "Pending" && (
                              <>
                                <button
                                  onClick={() => handleApprove(req.id)}
                                  className="p-1 bg-cyan-950 text-cyan-400 hover:bg-cyan-900 border border-cyan-800 rounded-lg transition-all"
                                  title="Approve Request"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleReject(req.id)}
                                  className="p-1 bg-red-950 text-red-400 hover:bg-red-900 border border-red-800 rounded-lg transition-all"
                                  title="Reject Request"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {(req.status === "Approved" || req.status === "Pending" || req.status === "Processing") && (
                              <button
                                onClick={() => handleGenerate(req.id)}
                                disabled={processingId === req.id || req.status === "Processing"}
                                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                                  processingId === req.id
                                    ? "bg-zinc-800 border-zinc-700 text-zinc-500"
                                    : "bg-green-600 border-green-500 text-white hover:bg-green-500 shadow-[0_0_10px_rgba(22,163,74,0.4)] cursor-pointer"
                                }`}
                              >
                                {processingId === req.id ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3.5 h-3.5" /> Generate Audio
                                  </>
                                )}
                              </button>
                            )}
                            {req.status === "Completed" && req.audioUrl && (
                              <a
                                href={req.audioUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-medium underline"
                              >
                                Play Vocal <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="space-y-6">
              {/* Premium Activator Form */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-md">
                <h3 className="text-base font-bold text-white mb-1">Email ID se Subscription Activate karein</h3>
                <p className="text-xs text-zinc-400 mb-4">Enter user's registered email address to instantly grant 1 month of unlimited vocal generations.</p>
                <form onSubmit={handleApproveByEmail} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={approveEmail}
                    onChange={(e) => setApproveEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-950 border border-zinc-850 text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={approving || !approveEmail}
                    className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {approving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Activating...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Activate Premium (1 Month)
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Users List Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-zinc-300 border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-sm bg-zinc-900/50">
                    <th className="py-3 px-4">Display Name</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Subscription Status</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4">Admin Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-zinc-500">No users found. Users register on signup page.</td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.uid} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="py-4 px-4 font-semibold text-white">{user.displayName || "N/A"}</td>
                        <td className="py-4 px-4 text-zinc-400">{user.email}</td>
                        <td className="py-4 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            user.subscriptionStatus === "Active" ? "bg-green-950 text-green-400 border border-green-900" :
                            user.subscriptionStatus === "Pending" ? "bg-amber-950 text-amber-400 border border-amber-900 animate-pulse" :
                            user.subscriptionStatus === "Expired" ? "bg-red-950 text-red-400 border border-red-900" :
                            "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }`}>
                            {user.subscriptionStatus || "None"}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-zinc-400">
                          {user.subscriptionExpiry ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                              {user.subscriptionExpiry}
                            </span>
                          ) : "Never"}
                        </td>
                        <td className="py-4 px-4 text-sm font-medium">
                          {user.role === "admin" ? (
                            <span className="text-rose-500">Super Admin</span>
                          ) : (
                            <span className="text-zinc-500">Regular User</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {editingUserId === user.uid ? (
                            <div className="flex flex-col items-end gap-2">
                              <input
                                type="date"
                                value={manualExpiry}
                                onChange={(e) => setManualExpiry(e.target.value)}
                                className="px-2 py-1 text-xs rounded bg-zinc-900 border border-zinc-800 text-white focus:outline-none"
                              />
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleUpdateSubscription(user.uid, "Active", manualExpiry)}
                                  className="px-2 py-1 bg-green-600 text-white hover:bg-green-500 rounded text-xs font-bold cursor-pointer"
                                >
                                  Activate
                                </button>
                                <button
                                  onClick={() => handleUpdateSubscription(user.uid, "Expired")}
                                  className="px-2 py-1 bg-red-600 text-white hover:bg-red-500 rounded text-xs font-bold cursor-pointer"
                                >
                                  Expire
                                </button>
                                <button
                                  onClick={() => setEditingUserId(null)}
                                  className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded text-xs font-bold cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingUserId(user.uid);
                                  const thirtyDays = new Date();
                                  thirtyDays.setDate(thirtyDays.getDate() + 30);
                                  setManualExpiry(thirtyDays.toISOString().split("T")[0]);
                                }}
                                className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                Edit Subscription
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* Prompt Control Tab */}
          {activeTab === "prompt" && (
            <div className="space-y-4">
              <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-850">
                <h3 className="text-sm font-semibold text-rose-400 mb-2">Active Gemini AI System Instruction</h3>
                <p className="text-sm text-zinc-300 italic">"{systemPrompt}"</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Modify System Prompt</label>
                <textarea
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  rows={4}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all"
                  placeholder="Enter custom instruction..."
                />
              </div>

              <button
                onClick={handleSavePrompt}
                className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-sm font-semibold shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all cursor-pointer"
              >
                Save System Instruction
              </button>
            </div>
          )}

          {/* Support Tab */}
          {activeTab === "support" && (
            <div className="space-y-6">
              {/* Add support link form */}
              <form onSubmit={handleAddLink} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-900/30 p-5 rounded-xl border border-zinc-850">
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-medium text-zinc-400">Link Name (e.g. YouTube, Instagram)</label>
                  <input
                    type="text"
                    required
                    placeholder="Instagram"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400 transition-all"
                  />
                </div>
                <div className="space-y-1.5 col-span-1">
                  <label className="text-xs font-medium text-zinc-400">Link URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://instagram.com/djvocaladda"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400 transition-all"
                  />
                </div>
                <div className="flex items-end justify-start col-span-1">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded-lg text-sm shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Link
                  </button>
                </div>
              </form>

              {/* View/manage current support links */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-400">Active Support & Contact Links</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {supportLinks.length === 0 ? (
                    <p className="text-sm text-zinc-500 col-span-full">No custom contact links added yet.</p>
                  ) : (
                    supportLinks.map(link => (
                      <div key={link.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-850 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                        <div>
                          <p className="font-semibold text-white text-sm">{link.title}</p>
                          <a href={link.url} target="_blank" rel="noreferrer" className="text-xs text-cyan-400 hover:underline truncate max-w-[150px] block mt-0.5">
                            {link.url}
                          </a>
                        </div>
                        <button
                          onClick={() => handleDeleteLink(link.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-500 transition-colors"
                          title="Delete link"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
