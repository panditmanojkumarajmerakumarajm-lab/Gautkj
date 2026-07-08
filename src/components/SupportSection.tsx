import React, { useEffect, useState } from "react";
import { SupportLink } from "../types";
import { HelpCircle, ExternalLink, MessageCircle } from "lucide-react";

export default function SupportSection() {
  const [links, setLinks] = useState<SupportLink[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const response = await fetch("/api/support-links");
        if (response.ok) {
          const list = await response.json();
          setLinks(list);
        }
      } catch (err) {
        console.error("Error loading support links:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLinks();
  }, []);

  return (
    <div id="support-section-container" className="bg-zinc-900/60 backdrop-blur-sm rounded-xl border border-zinc-800 p-6 md:p-8 max-w-2xl mx-auto shadow-lg">
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-4 mb-5">
        <HelpCircle className="w-6 h-6 text-cyan-400" />
        <h2 className="text-xl font-bold text-white tracking-tight">Need Help? Contact DJ Vocal Adda</h2>
      </div>

      <p className="text-zinc-300 text-sm leading-relaxed mb-6">
        Have questions about your subscription, payments, or custom vocal requirements? Reach out to us through our active social and contact channels below.
      </p>

      {loading ? (
        <p className="text-sm text-zinc-500 italic">Loading support contact channels...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Default WhatsApp Option */}
          <a
            href="https://wa.me/918955932061?text=Hello%20DJ%20Vocal%20Adda%2C%20I%20need%20assistance."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-green-950/40 hover:bg-green-900/30 border border-green-800/50 hover:border-green-700 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-green-400" />
              <div>
                <p className="font-semibold text-white text-sm">Official WhatsApp</p>
                <p className="text-xs text-green-400">+91 8955932061</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
          </a>

          {/* Admin Managed Links */}
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-zinc-800 rounded-lg text-cyan-400">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{link.title}</p>
                  <p className="text-xs text-zinc-500 truncate max-w-[150px]">{link.url}</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
            </a>
          ))}

          {links.length === 0 && (
            <div className="col-span-full py-4 text-center text-xs text-zinc-500">
              Check back soon for additional official social media channels.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
